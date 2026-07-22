import { NextResponse } from "next/server";
import {
  buildYooKassaCreatePaymentBody,
  buildYooKassaIdempotenceKey,
} from "@/features/payments/yookassa";
import { normalizeTariffPurchaseSlug } from "@/features/payments/tariff-purchase";
import { rejectForAppRole } from "@/lib/app-role";
import { loadEnv } from "@/lib/env";

export const runtime = "nodejs";

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

function getYooKassaConfirmationPayload(payload: unknown): {
  id: string;
  confirmationUrl: string;
} | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    id?: unknown;
    confirmation?: { confirmation_url?: unknown };
  };

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.confirmation?.confirmation_url !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    confirmationUrl: candidate.confirmation.confirmation_url,
  };
}

export async function POST(request: Request) {
  const env = loadEnv(process.env);
  const roleResponse = rejectForAppRole(
    "/api/payments/yookassa/create",
    env.APP_ROLE,
    ["app"],
  );

  if (roleResponse) {
    return roleResponse;
  }

  const regionResponse = rejectForAppRegion(
    "/api/payments/yookassa/create",
    env.APP_REGION,
    ["ru"],
  );

  if (regionResponse) {
    return regionResponse;
  }

  const { userId, tariffSlug, returnUrl } = await request.json();
  const normalizedTariffSlug = normalizeTariffPurchaseSlug(
    typeof tariffSlug === "string" ? tariffSlug : "",
  );
  const { prisma } = await import("@/db/prisma");

  if (!normalizedTariffSlug) {
    return NextResponse.json({ error: "Tariff not found" }, { status: 404 });
  }

  const tariffPlan = await prisma.tariffPlan.findUnique({
    where: { slug: normalizedTariffSlug },
  });

  if (!tariffPlan || !tariffPlan.active) {
    return NextResponse.json({ error: "Tariff not found" }, { status: 404 });
  }

  const body = buildYooKassaCreatePaymentBody({
    userId,
    tariffPlanId: tariffPlan.id,
    tariffSlug: tariffPlan.slug,
    tariffName: tariffPlan.name,
    tokenAmount: tariffPlan.tokenAmount,
    durationDays: tariffPlan.durationDays,
    returnUrl,
  });
  const amountValue = Number(
    (body as { amount?: { value?: string } }).amount?.value ?? Number.NaN,
  );

  const apiResponse = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.YOOKASSA_SHOP_ID ?? ""}:${env.YOOKASSA_SECRET_KEY ?? ""}`,
      ).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotence-Key": buildYooKassaIdempotenceKey({
        userId,
        tariffSlug: normalizedTariffSlug,
      }),
    },
    body: JSON.stringify(body),
  });

  const createdPayment = await apiResponse.json();
  const providerPayment = apiResponse.ok
    ? getYooKassaConfirmationPayload(createdPayment)
    : null;

  if (!providerPayment) {
    return NextResponse.json(
      { error: "YooKassa create payment request failed." },
      { status: 502 },
    );
  }

  await prisma.payment.create({
    data: {
      userId,
      provider: "yookassa",
      invoiceId: `yookassa:${providerPayment.id}`,
      status: "pending",
      amount: amountValue,
      currency: "RUB",
      providerRawId: providerPayment.id,
      providerPaymentId: providerPayment.id,
      tariffPlanId: tariffPlan.id,
      metadata: body as never,
    },
  });

  return NextResponse.json({
    confirmationUrl: providerPayment.confirmationUrl,
    paymentId: providerPayment.id,
  });
}
