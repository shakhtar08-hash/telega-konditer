import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyCloudPaymentsSignatureMock = vi.hoisted(() => vi.fn());
const parseCloudPaymentsInvoiceIdMock = vi.hoisted(() => vi.fn());
const createTriggerServiceMock = vi.hoisted(() => vi.fn());
const handleTriggerEventMock = vi.hoisted(() => vi.fn());

const paymentUpsertMock = vi.hoisted(() => vi.fn());
const scheduledMessageCreateMock = vi.hoisted(() => vi.fn());
const scheduledMessageFindFirstMock = vi.hoisted(() => vi.fn());
const userTariffUpsertMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const tariffPlanFindUniqueMock = vi.hoisted(() => vi.fn());
const triggerRuleFindManyMock = vi.hoisted(() => vi.fn());
const userFindUniqueMock = vi.hoisted(() => vi.fn());

type TriggerSchedulerDeps = {
  scheduleTrigger: (
    eventKey: string,
    chatId: string,
    state: {
      createdAt: Date;
      generationCount: number;
      groupIds: string[];
      hasActiveTariff: boolean;
      lastActivityAt: Date | null;
      plan: string;
      promoClaimed: boolean;
      remainingTokens: number;
      tariffExpired: boolean;
    },
    occurredAt?: Date,
  ) => Promise<unknown>;
};

vi.mock("@/features/payments/cloudpayments", () => ({
  cloudPaymentsProduct: {
    amount: 899,
    currency: "RUB",
  },
  parseCloudPaymentsInvoiceId: parseCloudPaymentsInvoiceIdMock,
  verifyCloudPaymentsSignature: verifyCloudPaymentsSignatureMock,
}));

vi.mock("@/features/triggers/trigger-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/triggers/trigger-service")>();

  return {
    ...actual,
    createTriggerService: (deps: Parameters<typeof actual.createTriggerService>[0]) => {
      createTriggerServiceMock(deps);
      return actual.createTriggerService(deps);
    },
  };
});

vi.mock("@/features/triggers/trigger-event-service", () => ({
  createTriggerEventService: (deps: TriggerSchedulerDeps) => ({
    handleTriggerEvent: async (
      eventKey: string,
      payload: { chatId: string; occurredAt?: Date },
    ) => {
      handleTriggerEventMock(eventKey, payload);
      await deps.scheduleTrigger(
        eventKey,
        payload.chatId,
        {
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          generationCount: 0,
          groupIds: [],
          hasActiveTariff: true,
          lastActivityAt: null,
          plan: "PRO",
          promoClaimed: false,
          remainingTokens: 100,
          tariffExpired: false,
        },
        payload.occurredAt,
      );
    },
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
    scheduledMessage: {
      create: scheduledMessageCreateMock,
      findFirst: scheduledMessageFindFirstMock,
    },
    tariffPlan: {
      findUnique: tariffPlanFindUniqueMock,
    },
    triggerRule: {
      findMany: triggerRuleFindManyMock,
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
  const originalAppRole = process.env.APP_ROLE;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.CLOUDPAYMENTS_API_SECRET = "secret";
    process.env.APP_ROLE = "app";

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
    triggerRuleFindManyMock.mockResolvedValue([]);
    scheduledMessageFindFirstMock.mockResolvedValue(null);
    scheduledMessageCreateMock.mockResolvedValue({
      buttons: null,
      chatId: "12345",
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      id: "scheduled_1",
      imageUrl: null,
      scenarioId: null,
      scenarioStepId: null,
      sendAt: new Date("2026-07-13T10:00:00.000Z"),
      sentAt: null,
      text: "",
      triggeredAt: new Date("2026-07-13T10:00:00.000Z"),
      triggerEventKey: "tariff.paid",
      triggerRuleId: "rule_1",
    });
    handleTriggerEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.APP_ROLE = originalAppRole;
  });

  it("rejects CloudPayments handling on the ingress role", async () => {
    process.env.APP_ROLE = "ingress";

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

    expect(response.status).toBe(409);
    expect(transactionMock).not.toHaveBeenCalled();
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

  it("loads scenario start steps before scheduling tariff.paid scenario triggers", async () => {
    triggerRuleFindManyMock.mockResolvedValue([
      {
        buttons: null,
        conditions: [],
        createdAt: new Date("2026-07-18T10:00:00.000Z"),
        delayUnit: "hours",
        delayValue: 1,
        deliveryType: "SCENARIO",
        eventKey: "tariff.paid",
        id: "rule_paid_scenario",
        imageUrl: null,
        messageText: "",
        name: "Paid flow",
        scenario: { startStepId: "step_paid_start" },
        scenarioId: "scenario_paid",
        status: "active",
        updatedAt: new Date("2026-07-18T10:00:00.000Z"),
      },
    ]);

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

    expect(triggerRuleFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          scenario: {
            select: { startStepId: true },
          },
        },
      }),
    );
    expect(scheduledMessageCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scenarioId: "scenario_paid",
        scenarioStepId: "step_paid_start",
        text: "",
      }),
    });
    await expect(response.json()).resolves.toEqual({ code: 0 });
  });
});
