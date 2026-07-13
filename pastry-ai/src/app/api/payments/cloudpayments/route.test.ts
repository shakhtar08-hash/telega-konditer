import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyCloudPaymentsSignatureMock = vi.hoisted(() => vi.fn());
const parseCloudPaymentsInvoiceIdMock = vi.hoisted(() => vi.fn());
const handleTriggerEventMock = vi.hoisted(() => vi.fn());

const paymentUpsertMock = vi.hoisted(() => vi.fn());
const userTariffUpsertMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const tariffPlanFindUniqueMock = vi.hoisted(() => vi.fn());
const userFindUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/payments/cloudpayments", () => ({
  cloudPaymentsProduct: {
    amount: 899,
    currency: "RUB",
  },
  parseCloudPaymentsInvoiceId: parseCloudPaymentsInvoiceIdMock,
  verifyCloudPaymentsSignature: verifyCloudPaymentsSignatureMock,
}));

vi.mock("@/features/triggers/trigger-service", () => ({
  createTriggerService: () => ({
    scheduleTrigger: vi.fn(),
    processPendingTriggers: vi.fn(),
  }),
}));

vi.mock("@/features/triggers/trigger-event-service", () => ({
  createTriggerEventService: () => ({
    handleTriggerEvent: handleTriggerEventMock,
  }),
}));

vi.mock("@/features/triggers/trigger-user-state", () => ({
  loadTriggerUserState: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    payment: {
      upsert: paymentUpsertMock,
    },
    tariffPlan: {
      findUnique: tariffPlanFindUniqueMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
    userTariff: {
      upsert: userTariffUpsertMock,
    },
  },
}));

import { POST } from "./route";

describe("POST /api/payments/cloudpayments", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.CLOUDPAYMENTS_API_SECRET = "secret";

    verifyCloudPaymentsSignatureMock.mockReturnValue(true);
    parseCloudPaymentsInvoiceIdMock.mockReturnValue({ userId: "user-1" });
    paymentUpsertMock.mockReturnValue({ kind: "payment-op" });
    userTariffUpsertMock.mockReturnValue({ kind: "tariff-op" });
    transactionMock.mockResolvedValue([
      {
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
        invoiceId: "pastry:user-1:1",
        userId: "user-1",
      },
      { userId: "user-1" },
    ]);
    tariffPlanFindUniqueMock.mockResolvedValue({
      durationDays: 30,
      id: "tariff-plan-1",
      tokenAmount: 100,
    });
    userFindUniqueMock.mockResolvedValue({
      telegramId: "12345",
    });
    handleTriggerEventMock.mockResolvedValue(undefined);
  });

  it("dispatches tariff.paid with a durable occurredAt from the persisted payment row", async () => {
    const response = await POST(
      new Request("https://example.com/api/payments/cloudpayments", {
        method: "POST",
        headers: {
          "Content-HMAC": "valid",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "InvoiceId=pastry%3Auser-1%3A1&Amount=899&Currency=RUB&TransactionId=txn-1",
      }),
    );

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(handleTriggerEventMock).toHaveBeenCalledWith("tariff.paid", {
      userId: "user-1",
      chatId: "12345",
      occurredAt: new Date("2026-07-13T10:00:00.000Z"),
    });
    await expect(response.json()).resolves.toEqual({ code: 0 });
  });
});
