import { beforeEach, describe, expect, it, vi } from "vitest";

const handleTelegramWebhookMock = vi.hoisted(() =>
  vi.fn(() => new Response("forwarded", { status: 202 })),
);
const loadEnvMock = vi.hoisted(() =>
  vi.fn(() => ({
    INTERNAL_API_SHARED_SECRET: "internal-secret",
    TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
  })),
);
const isValidInternalServiceRequestMock = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/app/api/telegram/webhook/route", () => ({
  POST: handleTelegramWebhookMock,
}));

vi.mock("@/lib/env", () => ({
  loadEnv: loadEnvMock,
}));

vi.mock("@/lib/internal-service-auth", () => ({
  isValidInternalServiceRequest: isValidInternalServiceRequestMock,
}));

import { POST } from "./route";

describe("POST /api/internal/telegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleTelegramWebhookMock.mockResolvedValue(
      new Response("forwarded", { status: 202 }),
    );
    loadEnvMock.mockReturnValue({
      INTERNAL_API_SHARED_SECRET: "internal-secret",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
    });
    isValidInternalServiceRequestMock.mockReturnValue(true);
  });

  it("rejects requests without the shared internal secret", async () => {
    isValidInternalServiceRequestMock.mockReturnValue(false);

    const response = await POST(
      new Request("https://example.com/api/internal/telegram", {
        body: JSON.stringify({ update_id: 42 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(handleTelegramWebhookMock).not.toHaveBeenCalled();
  });

  it("rejects requests when the internal shared secret is not configured", async () => {
    loadEnvMock.mockReturnValue({
      INTERNAL_API_SHARED_SECRET: "",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
    });

    const response = await POST(
      new Request("https://example.com/api/internal/telegram", {
        body: JSON.stringify({ update_id: 42 }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "internal-secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(handleTelegramWebhookMock).not.toHaveBeenCalled();
  });

  it("forwards the update to the public webhook handler with the Telegram secret", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/telegram", {
        body: JSON.stringify({ message: { text: "hi" }, update_id: 42 }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "internal-secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(202);
    expect(handleTelegramWebhookMock).toHaveBeenCalledTimes(1);
    expect(isValidInternalServiceRequestMock).toHaveBeenCalledTimes(1);

    const forwardedRequest = handleTelegramWebhookMock.mock.calls[0]?.[0];
    expect(forwardedRequest).toBeInstanceOf(Request);
    expect(forwardedRequest.headers.get("content-type")).toBe(
      "application/json",
    );
    expect(
      forwardedRequest.headers.get("x-telegram-bot-api-secret-token"),
    ).toBe("telegram-secret");
    await expect(forwardedRequest.text()).resolves.toBe(
      JSON.stringify({ message: { text: "hi" }, update_id: 42 }),
    );
  });
});
