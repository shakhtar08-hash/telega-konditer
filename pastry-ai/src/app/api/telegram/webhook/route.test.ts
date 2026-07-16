import { beforeEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.hoisted(() => vi.fn());
const webhookHandlerMock = vi.hoisted(() => vi.fn());
const webhookCallbackMock = vi.hoisted(() => vi.fn(() => webhookHandlerMock));
const initMock = vi.hoisted(() => vi.fn());
const handleUpdateMock = vi.hoisted(() => vi.fn());
const loadEnvMock = vi.hoisted(() => vi.fn(() => ({
  TELEGRAM_BOT_TOKEN: "bot-token",
  TELEGRAM_WEBHOOK_SECRET: "secret",
})));
const createPastryBotMock = vi.hoisted(() =>
  vi.fn(() => ({ handleUpdate: handleUpdateMock, init: initMock })),
);
const claimCreateMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("grammy", () => ({
  webhookCallback: webhookCallbackMock,
}));

vi.mock("@/lib/env", () => ({
  loadEnv: loadEnvMock,
}));

vi.mock("@/bot/create-bot", () => ({
  createPastryBot: createPastryBotMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    telegramSession: {
      create: claimCreateMock,
    },
  },
}));

vi.mock("@/db/repositories/user-repository", () => ({
  createUserRepository: vi.fn(() => ({})),
}));

vi.mock("@/db/repositories/tariff-plan-repository", () => ({
  createTariffPlanRepository: vi.fn(() => ({})),
}));

vi.mock("@/db/repositories/prompt-repository", () => ({
  createPromptRepository: vi.fn(() => ({})),
}));

vi.mock("@/features/users/user-service", () => ({
  createUserService: vi.fn(() => ({})),
}));

vi.mock("@/ai/prompts/prompt-loader", () => ({
  createPromptLoader: vi.fn(() => ({})),
}));

vi.mock("@/ai/provider/openai-provider", () => ({
  createOpenAIAIService: vi.fn(() => ({})),
}));

vi.mock("@/bot/middleware/session", () => ({
  createPrismaSessionStorage: vi.fn(() => ({})),
}));

vi.mock("@/ai/agents/photoshoot-agent", () => ({
  createPhotoshootAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/photoshoot/photoshoot-service", () => ({
  createPhotoshootService: vi.fn(() => ({
    generateStyledDessertPhoto: vi.fn(),
    generateStyledDessertPhotos: vi.fn(),
  })),
}));

vi.mock("@/ai/agents/recipe-agent", () => ({
  createRecipeAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/recipes/recipe-service", () => ({
  createRecipeService: vi.fn(() => ({})),
}));

vi.mock("@/db/repositories/user-tariff-repository", () => ({
  createUserTariffRepository: vi.fn(() => ({})),
}));

vi.mock("@/db/repositories/token-usage-repository", () => ({
  createTokenUsageRepository: vi.fn(() => ({})),
}));

vi.mock("@/features/tariffs/token-guard-service", () => ({
  createTokenGuardService: vi.fn(() => ({})),
}));

vi.mock("@/ai/agents/vision-agent", () => ({
  createVisionAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/vision/vision-service", () => ({
  createVisionService: vi.fn(() => ({})),
}));

vi.mock("@/ai/agents/free-lesson-agent", () => ({
  createFreeLessonAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/free-lesson/free-lesson-service", () => ({
  createFreeLessonService: vi.fn(() => ({})),
}));

vi.mock("@/ai/agents/ask-chef-agent", () => ({
  createAskChefAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/ask-chef/ask-chef-service", () => ({
  createAskChefService: vi.fn(() => ({})),
}));

vi.mock("@/ai/agents/recipe-card-agent", () => ({
  createRecipeCardAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/recipe-card/recipe-card-service", () => ({
  createRecipeCardService: vi.fn(() => ({})),
}));

vi.mock("@/ai/agents/text-prompt-agent", () => ({
  createTextPromptAgent: vi.fn(() => ({})),
}));

vi.mock("@/features/text-prompt/text-prompt-service", () => ({
  createTextPromptService: vi.fn(() => ({})),
}));

vi.mock("@/db/repositories/generated-recipe-context-repository", () => ({
  createGeneratedRecipeContextRepository: vi.fn(() => ({})),
}));

import {
  POST,
  claimTelegramUpdate,
  getTelegramUpdateId,
  isValidTelegramSecret,
  maxDuration,
} from "./route";

describe("isValidTelegramSecret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webhookHandlerMock.mockResolvedValue(new Response("handled"));
    initMock.mockResolvedValue(undefined);
    handleUpdateMock.mockResolvedValue(undefined);
    claimCreateMock.mockResolvedValue(undefined);
  });

  it("accepts matching secret token", () => {
    const request = new Request("https://example.com", {
      headers: { "x-telegram-bot-api-secret-token": "secret" },
    });

    expect(isValidTelegramSecret(request, "secret")).toBe(true);
  });

  it("rejects missing secret token", () => {
    const request = new Request("https://example.com");

    expect(isValidTelegramSecret(request, "secret")).toBe(false);
  });

  it("reads Telegram update id from webhook payloads", () => {
    expect(getTelegramUpdateId({ update_id: 123 })).toBe(123);
    expect(getTelegramUpdateId({ message: {} })).toBeNull();
  });

  it("claims Telegram updates once to prevent webhook retries from duplicating work", async () => {
    const claimedKeys = new Set<string>();
    const delegate = {
      create: async ({ data }: { data: { key: string } }) => {
        if (claimedKeys.has(data.key)) {
          throw { code: "P2002" };
        }

        claimedKeys.add(data.key);
      },
    };

    await expect(claimTelegramUpdate(delegate, 300442540)).resolves.toBe(true);
    await expect(claimTelegramUpdate(delegate, 300442540)).resolves.toBe(false);
  });

  it("allows long-running Telegram handlers enough time to finish image generation", () => {
    expect(maxDuration).toBeGreaterThan(10);
  });

  it("keeps rejecting public requests without the Telegram webhook secret", async () => {
    const response = await POST(
      new Request("https://example.com/api/telegram/webhook", {
        body: JSON.stringify({ update_id: 42 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(afterMock).not.toHaveBeenCalled();
    expect(initMock).not.toHaveBeenCalled();
    expect(handleUpdateMock).not.toHaveBeenCalled();
  });

  it("acknowledges Telegram immediately and processes the update in after()", async () => {
    const request = new Request("https://example.com/api/telegram/webhook", {
      body: JSON.stringify({ message: { text: "hi" }, update_id: 42 }),
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "secret",
      },
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("OK");
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(webhookCallbackMock).not.toHaveBeenCalled();
    expect(initMock).not.toHaveBeenCalled();
    expect(handleUpdateMock).not.toHaveBeenCalled();

    const task = afterMock.mock.calls[0]?.[0];
    expect(task).toBeTypeOf("function");

    await task();

    expect(webhookCallbackMock).not.toHaveBeenCalled();
    expect(webhookHandlerMock).not.toHaveBeenCalled();
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(handleUpdateMock).toHaveBeenCalledTimes(1);
    expect(handleUpdateMock).toHaveBeenCalledWith({
      message: { text: "hi" },
      update_id: 42,
    });
    expect(initMock.mock.invocationCallOrder[0]).toBeLessThan(
      handleUpdateMock.mock.invocationCallOrder[0] ?? Infinity,
    );
  });
});
