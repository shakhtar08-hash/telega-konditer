import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const buildYooKassaCreatePaymentBodyMock = vi.hoisted(() => vi.fn());
const buildYooKassaIdempotenceKeyMock = vi.hoisted(() => vi.fn());
const paymentCreateMock = vi.hoisted(() => vi.fn());
const tariffPlanFindUniqueMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/payments/yookassa", () => ({
  buildYooKassaCreatePaymentBody: buildYooKassaCreatePaymentBodyMock,
  buildYooKassaIdempotenceKey: buildYooKassaIdempotenceKeyMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    payment: {
      create: paymentCreateMock,
    },
    tariffPlan: {
      findUnique: tariffPlanFindUniqueMock,
    },
  },
}));

import { POST } from "./route";

describe("POST /api/payments/yookassa/create", () => {
  const originalAppRole = process.env.APP_ROLE;
  const originalAppRegion = process.env.APP_REGION;
  const originalCronSecret = process.env.CRON_SECRET;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalShopId = process.env.YOOKASSA_SHOP_ID;
  const originalSecretKey = process.env.YOOKASSA_SECRET_KEY;
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
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-webhook-secret";

    buildYooKassaCreatePaymentBodyMock.mockReturnValue({
      amount: { value: "990.00", currency: "RUB" },
      confirmation: {
        type: "redirect",
        return_url: "https://example.com/payments/return",
      },
      metadata: {
        userId: "user-1",
        tariffPlanId: "tariff-1",
        tariffSlug: "basic",
      },
    });
    buildYooKassaIdempotenceKeyMock.mockReturnValue("idem-1");
    tariffPlanFindUniqueMock.mockResolvedValue({
      id: "tariff-1",
      slug: "basic",
      name: "Кондитер",
      active: true,
      price: 990,
      tokenAmount: 120,
      durationDays: 30,
    });
    paymentCreateMock.mockResolvedValue({
      id: "db-payment-1",
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "payment-1",
        confirmation: {
          confirmation_url: "https://pay.example/confirm",
        },
      }),
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
    process.env.TELEGRAM_BOT_TOKEN = originalTelegramBotToken;
    process.env.TELEGRAM_WEBHOOK_SECRET = originalTelegramWebhookSecret;
    global.fetch = originalFetch;
  });

  it("creates a pending YooKassa payment for an active tariff and returns confirmationUrl", async () => {
    const response = await POST(
      new Request("https://example.com/api/payments/yookassa/create", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          tariffSlug: "pastry-chef",
          returnUrl: "https://example.com/payments/return",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(tariffPlanFindUniqueMock).toHaveBeenCalledWith({
      where: { slug: "basic" },
    });
    expect(buildYooKassaCreatePaymentBodyMock).toHaveBeenCalledWith({
      userId: "user-1",
      tariffPlanId: "tariff-1",
      tariffSlug: "basic",
      tariffName: "Кондитер",
      tokenAmount: 120,
      durationDays: 30,
      returnUrl: "https://example.com/payments/return",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.yookassa.ru/v3/payments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Basic c2hvcC1pZDpzZWNyZXQta2V5",
          "Content-Type": "application/json",
          "Idempotence-Key": "idem-1",
        }),
      }),
    );
    expect(paymentCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        provider: "yookassa",
        invoiceId: "yookassa:payment-1",
        status: "pending",
        amount: 990,
        currency: "RUB",
        providerRawId: "payment-1",
        providerPaymentId: "payment-1",
        tariffPlanId: "tariff-1",
        metadata: buildYooKassaCreatePaymentBodyMock.mock.results[0]?.value,
      }),
    });
    await expect(response.json()).resolves.toEqual({
      confirmationUrl: "https://pay.example/confirm",
      paymentId: "payment-1",
    });
  });

  it("returns 404 when the tariff is missing or inactive", async () => {
    tariffPlanFindUniqueMock.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("https://example.com/api/payments/yookassa/create", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          tariffSlug: "pastry-chef",
          returnUrl: "https://example.com/payments/return",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(paymentCreateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Tariff not found" });
  });

  it("rejects YooKassa creation on the ingress role", async () => {
    process.env.APP_ROLE = "ingress";

    const response = await POST(
      new Request("https://example.com/api/payments/yookassa/create", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          tariffSlug: "pastry-chef",
          returnUrl: "https://example.com/payments/return",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(409);
    expect(tariffPlanFindUniqueMock).not.toHaveBeenCalled();
  });

  it("fails closed outside the RU runtime region", async () => {
    process.env.APP_REGION = "eu";

    const response = await POST(
      new Request("https://example.com/api/payments/yookassa/create", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          tariffSlug: "pastry-chef",
          returnUrl: "https://example.com/payments/return",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(paymentCreateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error:
        "Route /api/payments/yookassa/create is not available on APP_REGION=eu.",
    });
  });

  it("returns a sanitized provider failure when YooKassa does not return a successful redirect payment shape", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        type: "error",
        description: "invalid request",
      }),
    });

    const response = await POST(
      new Request("https://example.com/api/payments/yookassa/create", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          tariffSlug: "pastry-chef",
          returnUrl: "https://example.com/payments/return",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(502);
    expect(paymentCreateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "YooKassa create payment request failed.",
    });
  });

  it("returns a sanitized provider failure when YooKassa omits confirmation_url in an otherwise successful response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "payment-1",
        confirmation: {
          type: "redirect",
        },
      }),
    });

    const response = await POST(
      new Request("https://example.com/api/payments/yookassa/create", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          tariffSlug: "pastry-chef",
          returnUrl: "https://example.com/payments/return",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(502);
    expect(paymentCreateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "YooKassa create payment request failed.",
    });
  });
});
