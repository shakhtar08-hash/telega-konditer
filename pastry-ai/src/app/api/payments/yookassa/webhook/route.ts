import { Prisma, type ScheduledMessage, type TriggerRule } from "@prisma/client";
import { createTriggerEventService } from "@/features/triggers/trigger-event-service";
import {
  createTriggerService,
  type ScheduledMessageRecord,
  type TriggerMessageRecord,
} from "@/features/triggers/trigger-service";
import { loadTriggerUserState } from "@/features/triggers/trigger-user-state";
import { prisma } from "@/db/prisma";
import { rejectForAppRole } from "@/lib/app-role";
import { loadEnv } from "@/lib/env";

export const runtime = "nodejs";

type TriggerRuleWithScenario = TriggerRule & {
  scenario?: { startStepId: string | null } | null;
};

type WebhookPayload = {
  event?: unknown;
  object?: {
    id?: unknown;
    amount?: { value?: unknown; currency?: unknown };
    metadata?: { tariffPlanId?: unknown; userId?: unknown; tariffSlug?: unknown };
    paid?: unknown;
    payment_method?: { id?: unknown; saved?: unknown };
    status?: unknown;
  };
};

type VerifiedPayment = {
  amount: number;
  currency: string;
  invoiceId: string;
  paymentId: string;
  paymentMethodId: string | null;
  raw: Record<string, unknown>;
  tariffPlanId: string;
  userId: string;
};

function rejectForAppRegion(
  routePath: string,
  region: string | undefined,
  allowedRegions: readonly string[],
): Response | null {
  const resolvedRegion = region ?? "undefined";

  if (allowedRegions.includes(resolvedRegion)) {
    return null;
  }

  return Response.json(
    {
      error: `Route ${routePath} is not available on APP_REGION=${resolvedRegion}.`,
    },
    { status: 409 },
  );
}

function toTriggerRuleRecord(rule: TriggerRuleWithScenario): TriggerMessageRecord {
  const record = {
    ...rule,
    buttons: rule.buttons,
    deliveryType: rule.deliveryType as TriggerMessageRecord["deliveryType"],
    scenarioId: rule.scenarioId,
    startStepId: rule.scenario?.startStepId ?? null,
    conditions: rule.conditions as TriggerMessageRecord["conditions"],
    delayUnit: rule.delayUnit as TriggerMessageRecord["delayUnit"],
    status: rule.status as TriggerMessageRecord["status"],
  } as TriggerMessageRecord & { startStepId: string | null };

  return record;
}

function toScheduledMessageRecord(
  scheduledMessage: ScheduledMessage,
): ScheduledMessageRecord {
  return {
    ...scheduledMessage,
    buttons: scheduledMessage.buttons,
  };
}

function toPrismaJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function parseWebhookPaymentCandidate(payload: WebhookPayload) {
  if (payload.event !== "payment.succeeded") {
    return null;
  }

  const paymentId = payload.object?.id;
  const userId = payload.object?.metadata?.userId;
  const tariffPlanId = payload.object?.metadata?.tariffPlanId;
  const amountValue = payload.object?.amount?.value;
  const amountCurrency = payload.object?.amount?.currency;

  if (
    typeof paymentId !== "string" ||
    typeof userId !== "string" ||
    typeof tariffPlanId !== "string" ||
    typeof amountValue !== "string" ||
    typeof amountCurrency !== "string"
  ) {
    return null;
  }

  return {
    amount: Number(amountValue),
    currency: amountCurrency,
    invoiceId: `yookassa:${paymentId}`,
    paymentId,
    tariffPlanId,
    userId,
  };
}

function parseVerifiedPayment(
  paymentId: string,
  payment: unknown,
): VerifiedPayment | null {
  if (!payment || typeof payment !== "object") {
    return null;
  }

  const candidate = payment as {
    amount?: { value?: unknown; currency?: unknown };
    id?: unknown;
    metadata?: { tariffPlanId?: unknown; userId?: unknown };
    paid?: unknown;
    payment_method?: { id?: unknown; saved?: unknown };
    status?: unknown;
  };

  if (
    candidate.id !== paymentId ||
    candidate.status !== "succeeded" ||
    candidate.paid !== true ||
    typeof candidate.metadata?.userId !== "string" ||
    typeof candidate.metadata?.tariffPlanId !== "string" ||
    typeof candidate.amount?.value !== "string" ||
    typeof candidate.amount?.currency !== "string"
  ) {
    return null;
  }

  return {
    amount: Number(candidate.amount.value),
    currency: candidate.amount.currency,
    invoiceId: `yookassa:${paymentId}`,
    paymentId,
    paymentMethodId:
      candidate.payment_method?.saved === true &&
      typeof candidate.payment_method.id === "string"
        ? candidate.payment_method.id
        : null,
    raw: payment as Record<string, unknown>,
    tariffPlanId: candidate.metadata.tariffPlanId,
    userId: candidate.metadata.userId,
  };
}

async function fetchVerifiedPayment(
  paymentId: string,
  webhookPayment: ReturnType<typeof parseWebhookPaymentCandidate>,
) {
  const env = loadEnv(process.env);
  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.YOOKASSA_SHOP_ID ?? ""}:${env.YOOKASSA_SECRET_KEY ?? ""}`,
      ).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const verifiedPayment = parseVerifiedPayment(paymentId, await response.json());

  if (
    !verifiedPayment ||
    !webhookPayment ||
    verifiedPayment.userId !== webhookPayment.userId ||
    verifiedPayment.tariffPlanId !== webhookPayment.tariffPlanId ||
    verifiedPayment.amount !== webhookPayment.amount ||
    verifiedPayment.currency !== webhookPayment.currency
  ) {
    return null;
  }

  return verifiedPayment;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (
    process.env.APP_ROLE === "ingress" &&
    process.env.INTERNAL_API_BASE_URL
  ) {
    const response = await fetch(
      new URL("/api/payments/yookassa/webhook", process.env.INTERNAL_API_BASE_URL).toString(),
      {
        body: rawBody,
        headers: {
          "content-type": "application/json",
          ...(process.env.INTERNAL_API_SHARED_SECRET
            ? { "x-internal-shared-secret": process.env.INTERNAL_API_SHARED_SECRET }
            : {}),
        },
        method: "POST",
      },
    );

    return new Response(await response.text(), { status: response.status });
  }

  const roleResponse = rejectForAppRole(
    "/api/payments/yookassa/webhook",
    process.env.APP_ROLE,
    ["app"],
  );

  if (roleResponse) {
    return roleResponse;
  }

  const regionResponse = rejectForAppRegion(
    "/api/payments/yookassa/webhook",
    process.env.APP_REGION,
    ["ru"],
  );

  if (regionResponse) {
    return regionResponse;
  }

  const payload = rawBody ? (JSON.parse(rawBody) as WebhookPayload) : {};
  const webhookPayment = parseWebhookPaymentCandidate(payload);

  if (!webhookPayment) {
    return Response.json({ ok: true });
  }

  const verifiedPayment = await fetchVerifiedPayment(
    webhookPayment.paymentId,
    webhookPayment,
  );

  if (!verifiedPayment) {
    return Response.json(
      { error: "Unable to verify YooKassa payment." },
      { status: 502 },
    );
  }

  const tariffPlan = await prisma.tariffPlan.findUnique({
    where: { id: verifiedPayment.tariffPlanId },
  });

  if (!tariffPlan) {
    return Response.json({ ok: true });
  }

  const result = await prisma.$transaction(async (tx) => {
    const paidAt = new Date();
    const expiresAt = new Date(
      paidAt.getTime() + tariffPlan.durationDays * 24 * 60 * 60 * 1000,
    );

    const existingPayment = await tx.payment.findUnique({
      where: { invoiceId: verifiedPayment.invoiceId },
      select: { createdAt: true, paidAt: true, status: true },
    });

    if (existingPayment?.status === "paid") {
      return {
        duplicate: true,
        occurredAt: existingPayment.paidAt ?? existingPayment.createdAt,
      };
    }

    const payment =
      existingPayment !== null
        ? await tx.payment.update({
            where: { invoiceId: verifiedPayment.invoiceId },
            data: {
              status: "paid",
              providerRawId: verifiedPayment.paymentId,
              providerPaymentId: verifiedPayment.paymentId,
              providerEventType: "payment.succeeded",
              tariffPlanId: tariffPlan.id,
              paymentMethodId: verifiedPayment.paymentMethodId,
              paidAt,
              metadata: verifiedPayment.raw as Prisma.InputJsonValue,
            },
            select: { createdAt: true, paidAt: true },
          })
        : await tx.payment.create({
            data: {
              userId: verifiedPayment.userId,
              provider: "yookassa",
              invoiceId: verifiedPayment.invoiceId,
              status: "paid",
              amount: verifiedPayment.amount,
              currency: verifiedPayment.currency,
              providerRawId: verifiedPayment.paymentId,
              providerPaymentId: verifiedPayment.paymentId,
              providerEventType: "payment.succeeded",
              tariffPlanId: tariffPlan.id,
              paymentMethodId: verifiedPayment.paymentMethodId,
              paidAt,
              metadata: verifiedPayment.raw as Prisma.InputJsonValue,
            },
            select: { createdAt: true, paidAt: true },
          });

    await tx.userTariff.upsert({
      where: { userId: verifiedPayment.userId },
      update: {
        tariffPlanId: tariffPlan.id,
        remainingTokens: tariffPlan.tokenAmount,
        startedAt: paidAt,
        expiresAt,
      },
      create: {
        userId: verifiedPayment.userId,
        tariffPlanId: tariffPlan.id,
        remainingTokens: tariffPlan.tokenAmount,
        startedAt: paidAt,
        expiresAt,
      },
    });

    await tx.subscription.upsert({
      where: { userId: verifiedPayment.userId },
      update: {
        provider: "yookassa",
        status: verifiedPayment.paymentMethodId ? "active" : "one_month_paid",
        tariffPlanId: tariffPlan.id,
        paymentMethodId: verifiedPayment.paymentMethodId,
        lastPaidAt: paidAt,
        nextChargeAt: expiresAt,
        expiresAt,
        canceledAt: null,
        failureReason: null,
        lastFailureAt: null,
      },
      create: {
        userId: verifiedPayment.userId,
        provider: "yookassa",
        status: verifiedPayment.paymentMethodId ? "active" : "one_month_paid",
        tariffPlanId: tariffPlan.id,
        paymentMethodId: verifiedPayment.paymentMethodId,
        startedAt: paidAt,
        lastPaidAt: paidAt,
        nextChargeAt: expiresAt,
        expiresAt,
      },
    });

    return {
      duplicate: false,
      occurredAt: payment.paidAt ?? payment.createdAt,
    };
  });

  if (result.duplicate || !result.occurredAt) {
    return Response.json({ ok: true });
  }

  const user = await prisma.user.findUnique({
    where: { id: verifiedPayment.userId },
    select: { telegramId: true },
  });

  if (user) {
    const triggerService = createTriggerService({
      findActiveRulesByEvent: async (eventKey) => {
        const rules = await prisma.triggerRule.findMany({
          include: {
            scenario: {
              select: { startStepId: true },
            },
          },
          where: { eventKey, status: "active" },
          orderBy: [{ delayValue: "asc" }, { createdAt: "asc" }],
        });

        return rules.map(toTriggerRuleRecord);
      },
      createScheduled: async (data) =>
        toScheduledMessageRecord(
          await prisma.scheduledMessage.create({
            data: {
              ...data,
              buttons: toPrismaJsonValue(data.buttons),
            },
          }),
        ),
      findExistingScheduled: async (triggerRuleId, chatId, eventOccurredAt) =>
        prisma.scheduledMessage.findFirst({
          where: { triggerRuleId, chatId, triggeredAt: eventOccurredAt, sentAt: null },
          select: { id: true },
        }),
      findPendingScheduled: async () => [],
      markSent: async () => {},
    });
    const triggerEventService = createTriggerEventService({
      loadTriggerUserState,
      scheduleTrigger: triggerService.scheduleTrigger,
    });

    await triggerEventService.handleTriggerEvent("tariff.paid", {
      userId: verifiedPayment.userId,
      chatId: user.telegramId,
      occurredAt: result.occurredAt,
    });
  }

  return Response.json({ ok: true });
}
