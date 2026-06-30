import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import {
  cloudPaymentsProduct,
  parseCloudPaymentsInvoiceId,
  verifyCloudPaymentsSignature,
} from "@/features/payments/cloudpayments";

export const runtime = "nodejs";

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
    prisma.subscription.upsert({
      where: { userId: invoice.userId },
      update: {
        expiresAt: getNextMonth(),
        provider: "cloudpayments",
        status: "active",
      },
      create: {
        expiresAt: getNextMonth(),
        provider: "cloudpayments",
        status: "active",
        userId: invoice.userId,
      },
    }),
    prisma.user.update({
      where: { id: invoice.userId },
      data: {
        credits: { increment: 70 },
        plan: "PRO",
      },
    }),
  ]);

  return NextResponse.json({ code: 0 });
}

function getNextMonth() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}
