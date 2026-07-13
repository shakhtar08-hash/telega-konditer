import { createTriggerEventService } from "@/features/triggers/trigger-event-service";
import { createTriggerService, TriggerMessageRecord, ScheduledMessageRecord } from "@/features/triggers/trigger-service";
import { loadTriggerUserState } from "@/features/triggers/trigger-user-state";
import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import {
  cloudPaymentsProduct,
  parseCloudPaymentsInvoiceId,
  verifyCloudPaymentsSignature,
} from "@/features/payments/cloudpayments";

export const runtime = "nodejs";

const triggerRuleModel = (prisma as unknown as {
  triggerRule: {
    findMany(args: unknown): Promise<TriggerMessageRecord[]>;
  };
}).triggerRule;

const scheduledMessageModel = prisma.scheduledMessage as unknown as {
  create(args: unknown): Promise<ScheduledMessageRecord>;
  findFirst(args: unknown): Promise<{ id: string } | null>;
};

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.CLOUDPAYMENTS_API_SECRET;

  if (
    !secret ||
    !verifyCloudPaymentsSignature(body, request.headers.get("Content-HMAC"), secret)
  ) {
    return NextResponse.json({ code: 13 });
  }

  const formData = new URLSearchParams(body);
  const invoiceId = formData.get("InvoiceId") ?? "";
  const invoice = parseCloudPaymentsInvoiceId(invoiceId);

  if (!invoice) {
    return NextResponse.json({ code: 13 });
  }

  const amount = Number(formData.get("Amount") ?? "");
  const currency = formData.get("Currency") ?? "";

  if (
    amount !== cloudPaymentsProduct.amount ||
    currency !== cloudPaymentsProduct.currency
  ) {
    return NextResponse.json({ code: 13 });
  }

  const tariffPlan = await prisma.tariffPlan.findUnique({ where: { slug: "pastry-chef" } });
  if (!tariffPlan) {
    return NextResponse.json({ code: 13 });
  }

  await prisma.$transaction([
    prisma.payment.upsert({
      where: { invoiceId },
      update: {
        providerRawId: formData.get("TransactionId"),
        status: "paid",
      },
      create: {
        amount: cloudPaymentsProduct.amount,
        currency: cloudPaymentsProduct.currency,
        invoiceId,
        provider: "cloudpayments",
        providerRawId: formData.get("TransactionId"),
        status: "paid",
        userId: invoice.userId,
      },
    }),
    prisma.userTariff.upsert({
      where: { userId: invoice.userId },
      update: {
        tariffPlanId: tariffPlan.id,
        remainingTokens: tariffPlan.tokenAmount,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + tariffPlan.durationDays * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: invoice.userId,
        tariffPlanId: tariffPlan.id,
        remainingTokens: tariffPlan.tokenAmount,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + tariffPlan.durationDays * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: invoice.userId },
    select: { telegramId: true },
  });

  if (user) {
    const triggerService = createTriggerService({
      findActiveRulesByEvent: async (eventKey) =>
        triggerRuleModel.findMany({
          where: { eventKey, status: "active" },
          orderBy: [{ delayValue: "asc" }, { createdAt: "asc" }],
        }),
      createScheduled: async (data) =>
        scheduledMessageModel.create({ data }),
      findExistingScheduled: async (triggerRuleId, chatId, eventOccurredAt) =>
        scheduledMessageModel.findFirst({
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
      userId: invoice.userId,
      chatId: user.telegramId,
    });
  }

  return NextResponse.json({ code: 0 });
}
