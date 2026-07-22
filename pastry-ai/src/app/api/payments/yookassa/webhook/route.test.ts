import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createTriggerServiceMock = vi.hoisted(() => vi.fn());
const handleTriggerEventMock = vi.hoisted(() => vi.fn());

const paymentCreateMock = vi.hoisted(() => vi.fn());
const paymentFindUniqueMock = vi.hoisted(() => vi.fn());
const paymentUpdateMock = vi.hoisted(() => vi.fn());
const scheduledMessageCreateMock = vi.hoisted(() => vi.fn());
const scheduledMessageFindFirstMock = vi.hoisted(() => vi.fn());
const subscriptionUpsertMock = vi.hoisted(() => vi.fn());
const tariffPlanFindUniqueMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const triggerRuleFindManyMock = vi.hoisted(() => vi.fn());
const userFindUniqueMock = vi.hoisted(() => vi.fn());
const userTariffUpsertMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

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

type TransactionClient = {
  payment: {
    create: typeof paymentCreateMock;
    findUnique: typeof paymentFindUniqueMock;
    update: typeof paymentUpdateMock;
  };
  subscription: {
    upsert: typeof subscriptionUpsertMock;
  };
  userTariff: {
    upsert: typeof userTariffUpsertMock;
  };
};

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
          remainingTokens: 120,
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
      create: paymentCreateMock,
      findUnique: paymentFindUniqueMock,
      update: paymentUpdateMock,
    },
    scheduledMessage: {
      create: scheduledMessageCreateMock,
      findFirst: scheduledMessageFindFirstMock,
    },
    subscription: {
      upsert: subscriptionUpsertMock,
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

function buildWebhookBody() {
  return {
    event: "payment.succeeded",
    object: {
      id: "payment-1",
      status: "succeeded",
      paid: true,
      amount: { value: "990.00", currency: "RUB" },
      metadata: {
        userId: "user-1",
        tariffPlanId: "tariff-1",
        tariffSlug: "pastry-chef",
      },
      payment_method: {
        id: "pm-1",
        saved: true,
      },
    },
  };
}

function buildAuthoritativePayment(overrides?: Partial<ReturnType<typeof buildWebhookBody>["object"]>) {
  return {
    id: "payment-1",
    status: "succeeded",
    paid: true,
    amount: { value: "990.00", currency: "RUB" },
    metadata: {
      userId: "user-1",
      tariffPlanId: "tariff-1",
      tariffSlug: "pastry-chef",
    },
    payment_method: {
      id: "pm-1",
      saved: true,
    },
    ...overrides,
  };
}

function buildRequest(body = buildWebhookBody()) {
  return new Request("https://example.com/api/payments/yookassa/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/yookassa/webhook", () => {
  const originalAppRole = process.env.APP_ROLE;
  const originalAppRegion = process.env.APP_REGION;
  const originalCronSecret = process.env.CRON_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalShopId = process.env.YOOKASSA_SHOP_ID;
  const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;
  const originalInternalApiBaseUrl = process.env.INTERNAL_API_BASE_URL;
  const originalInternalApiSharedSecret = process.env.INTERNAL_API_SHARED_SECRET;
  const originalTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalTelegramWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.APP_ROLE = "app";
    process.env.APP_REGION = "ru";
    process.env.CRON_SECRET = "cron-secret";
    process.env.DATABASE_URL = "postgresql://localhost:5432/pastry";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.YOOKASSA_SHOP_ID = "shop-id";
    process.env.YOOKASSA_SECRET_KEY = "secret-key";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-webhook-secret";

    paymentCreateMock.mockResolvedValue({
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      id: "db-payment-1",
      invoiceId: "yookassa:payment-1",
      paidAt: new Date("2026-07-13T10:00:00.000Z"),
      status: "paid",
      userId: "user-1",
    });
    paymentFindUniqueMock.mockResolvedValue({
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      id: "db-payment-1",
      invoiceId: "yookassa:payment-1",
      paidAt: new Date("2026-07-13T10:00:00.000Z"),
      status: "paid",
      userId: "user-1",
    });
    paymentUpdateMock.mockResolvedValue({
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      paidAt: new Date("2026-07-13T10:05:00.000Z"),
    });
    userTariffUpsertMock.mockResolvedValue({ id: "user-tariff-1" });
    subscriptionUpsertMock.mockResolvedValue({ id: "subscription-1" });
    tariffPlanFindUniqueMock.mockResolvedValue({
      durationDays: 30,
      id: "tariff-1",
      tokenAmount: 120,
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
    transactionMock.mockImplementation(async (callback: (tx: TransactionClient) => unknown) =>
      callback({
        payment: {
          create: paymentCreateMock,
          findUnique: paymentFindUniqueMock,
          update: paymentUpdateMock,
        },
        subscription: {
          upsert: subscriptionUpsertMock,
        },
        userTariff: {
          upsert: userTariffUpsertMock,
        },
      }),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => buildAuthoritativePayment(),
    });
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    process.env.APP_ROLE = originalAppRole;
    process.env.APP_REGION = originalAppRegion;
    process.env.CRON_SECRET = originalCronSecret;
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    process.env.YOOKASSA_SHOP_ID = originalShopId;
    process.env.YOOKASSA_SECRET_KEY = originalSecretKey;
    process.env.INTERNAL_API_BASE_URL = originalInternalApiBaseUrl;
    process.env.INTERNAL_API_SHARED_SECRET = originalInternalApiSharedSecret;
    process.env.TELEGRAM_BOT_TOKEN = originalTelegramBotToken;
    process.env.TELEGRAM_WEBHOOK_SECRET = originalTelegramWebhookSecret;
    global.fetch = originalFetch;
  });

  it("verifies the payment with YooKassa before activating the tariff", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () =>
        buildAuthoritativePayment({
          metadata: {
            userId: "user-1",
            tariffPlanId: "tariff-other",
            tariffSlug: "pastry-chef",
          },
        }),
    });

    const response = await POST(buildRequest());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.yookassa.ru/v3/payments/payment-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Basic c2hvcC1pZDpzZWNyZXQta2V5",
        }),
        method: "GET",
      }),
    );
    expect(response.status).toBe(502);
    expect(paymentCreateMock).not.toHaveBeenCalled();
    expect(userTariffUpsertMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Unable to verify YooKassa payment.",
    });
  });

  it("handles concurrent duplicate deliveries without double-activating the tariff", async () => {
    const createdAt = new Date("2026-07-13T10:00:00.000Z");
    let paymentRecord:
      | { createdAt: Date; paidAt: Date | null; status: string }
      | null = null;
    const firstLookupGate: { release?: () => void; started?: () => void } = {};
    const firstLookupMayFinish = new Promise<void>((resolve) => {
      firstLookupGate.release = resolve;
    });
    const firstLookupStarted = new Promise<void>((resolve) => {
      firstLookupGate.started = resolve;
    });
    let findUniqueCallCount = 0;

    paymentFindUniqueMock.mockImplementation(async () => {
      findUniqueCallCount += 1;

      if (findUniqueCallCount === 1) {
        firstLookupGate.started?.();
        await firstLookupMayFinish;
      }

      return paymentRecord;
    });

    paymentCreateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      paymentRecord = {
        createdAt,
        paidAt: data.paidAt as Date,
        status: "paid",
      };

      return {
        createdAt,
        paidAt: data.paidAt,
      };
    });

    paymentUpdateMock.mockImplementation(async () => {
      paymentRecord = {
        createdAt,
        paidAt: createdAt,
        status: "paid",
      };

      return {
        createdAt,
        paidAt: createdAt,
      };
    });

    const firstResponsePromise = POST(buildRequest());
    const secondResponsePromise = POST(buildRequest());

    await firstLookupStarted;
    const releaseFirstLookup = firstLookupGate.release;
    if (typeof releaseFirstLookup !== "function") {
      throw new Error("The first lookup gate was not initialized.");
    }
    releaseFirstLookup();

    const [firstResponse, secondResponse] = await Promise.all([
      firstResponsePromise,
      secondResponsePromise,
    ]);

    await expect(firstResponse.json()).resolves.toEqual({ ok: true });
    await expect(secondResponse.json()).resolves.toEqual({ ok: true });
    expect(paymentCreateMock).toHaveBeenCalledTimes(1);
    expect(paymentUpdateMock).not.toHaveBeenCalled();
    expect(userTariffUpsertMock).toHaveBeenCalledTimes(1);
    expect(subscriptionUpsertMock).toHaveBeenCalledTimes(1);
    expect(handleTriggerEventMock).toHaveBeenCalledTimes(1);
  });

  it("ignores unsupported webhook events", async () => {
    const response = await POST(
      buildRequest({
        event: "payment.waiting_for_capture",
        object: {
          ...buildWebhookBody().object,
          id: "payment-1",
        },
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    expect(handleTriggerEventMock).not.toHaveBeenCalled();
  });

  it("forwards YooKassa webhook handling from ingress to the RU app", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.APP_REGION = "eu";
    fetchMock.mockResolvedValueOnce({
      status: 200,
      text: async () => '{"ok":true}',
    });

    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://10.10.0.1:3000/api/payments/yookassa/webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-internal-shared-secret": "shared-secret",
        }),
        body: JSON.stringify(buildWebhookBody()),
      }),
    );
    expect(transactionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("fails closed outside the RU runtime region", async () => {
    process.env.APP_REGION = "eu";

    const response = await POST(buildRequest());

    expect(response.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error:
        "Route /api/payments/yookassa/webhook is not available on APP_REGION=eu.",
    });
  });
});
