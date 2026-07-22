import { InputFile } from "grammy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PastryBotContext } from "./context";

const {
  buildFeatureCookieBlockMock,
  buildPromptMenuKeyboardMock,
  buildPromptMenuMessageMock,
  findPromptMenuItemMock,
  fetchMock,
  getPromptSelectionTextMock,
  loadPromptMenuItemsMock,
  buildExpiredTariffKeyboardMock,
  buildPaymentUrlMock,
  isPublicAppBaseUrlMock,
  loadExpiredTariffStepMock,
  resolveTelegramPhotoInputMock,
  resolveBuyButtonUrlMock,
  prismaMock,
} = vi.hoisted(() => ({
  buildFeatureCookieBlockMock: vi.fn(),
  buildPromptMenuKeyboardMock: vi.fn(),
  buildPromptMenuMessageMock: vi.fn(),
  findPromptMenuItemMock: vi.fn(),
  fetchMock: vi.fn(),
  getPromptSelectionTextMock: vi.fn(),
  loadPromptMenuItemsMock: vi.fn(),
  buildExpiredTariffKeyboardMock: vi.fn(),
  buildPaymentUrlMock: vi.fn(),
  isPublicAppBaseUrlMock: vi.fn(),
  loadExpiredTariffStepMock: vi.fn(),
  resolveTelegramPhotoInputMock: vi.fn(),
  resolveBuyButtonUrlMock: vi.fn(),
  prismaMock: {
    photoStyle: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    userTariff: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/features/tariffs/cookie-info", () => ({
  buildFeatureCookieBlock: buildFeatureCookieBlockMock,
}));

vi.mock("./context", () => ({
  clearScenarioSession: vi.fn(),
  setActivePrompt: vi.fn(),
}));

vi.mock("./onboarding", () => ({
  buildExpiredTariffKeyboard: buildExpiredTariffKeyboardMock,
  buildPaymentUrl: buildPaymentUrlMock,
  isPublicAppBaseUrl: isPublicAppBaseUrlMock,
  loadExpiredTariffStep: loadExpiredTariffStepMock,
  resolveBuyButtonUrl: resolveBuyButtonUrlMock,
}));

vi.mock("./telegram-media", () => ({
  resolveTelegramPhotoInput: resolveTelegramPhotoInputMock,
}));

vi.mock("./prompt-menu", () => ({
  buildPromptMenuKeyboard: buildPromptMenuKeyboardMock,
  buildPromptMenuMessage: buildPromptMenuMessageMock,
  findPromptMenuItem: findPromptMenuItemMock,
  getPromptSelectionText: getPromptSelectionTextMock,
  loadPromptMenuItems: loadPromptMenuItemsMock,
}));

import {
  handleTariffPurchase,
  openMainMenu,
  openScenarioBySlug,
  openScenarioFromItem,
  sendExpiredTariffMessage,
} from "./command-actions";

type TestContext = PastryBotContext & {
  api: PastryBotContext["api"] & {
    sendMessage: ReturnType<typeof vi.fn>;
  };
  reply: ReturnType<typeof vi.fn>;
  replyWithPhoto: ReturnType<typeof vi.fn>;
};

function createContext(): TestContext {
  return {
    api: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
    chat: {
      id: 123,
      type: "private",
    },
    from: {
      first_name: "Test",
      id: 123,
      is_bot: false,
      username: "test_user",
    },
    reply: vi.fn().mockResolvedValue(undefined),
    replyWithPhoto: vi.fn().mockResolvedValue(undefined),
    session: {},
  } as unknown as TestContext;
}

describe("command action messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    process.env.APP_BASE_URL = "https://pastry.example.com";
    delete process.env.INTERNAL_API_BASE_URL;

    buildFeatureCookieBlockMock.mockReturnValue("  �! W � �!  U");
    buildPromptMenuKeyboardMock.mockReturnValue({ inline_keyboard: [] });
    buildPromptMenuMessageMock.mockResolvedValue(" Z � !");
    buildExpiredTariffKeyboardMock.mockReturnValue({ inline_keyboard: [] });
    buildPaymentUrlMock.mockReturnValue("https://eu-gateway.example.com/pay?telegramId=123");
    getPromptSelectionTextMock.mockReturnValue(" !9  !9 �! � � Q:  ! Q � Q");
    isPublicAppBaseUrlMock.mockReturnValue(true);
    loadPromptMenuItemsMock.mockResolvedValue([]);
    loadExpiredTariffStepMock.mockResolvedValue({
      imagePath: "/uploads/admin/funnel/offer.jpg",
      text: "Оплатите тариф",
      title: "expired",
      nextButtonText: "",
      nextAction: "next",
      buyButtons: [],
      buyButtonText: "",
      buyButtonUrl: null,
      offerButtonText: null,
    });
    prismaMock.photoStyle.count.mockResolvedValue(0);
    prismaMock.photoStyle.findMany.mockResolvedValue([]);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.userTariff.findUnique.mockResolvedValue(null);
    resolveTelegramPhotoInputMock.mockReturnValue(
      new InputFile(Buffer.from("image"), "offer.jpg"),
    );
    resolveBuyButtonUrlMock.mockReturnValue("https://eu-gateway.example.com/pay?telegramId=123");
  });

  it("replies with readable Russian text when a command scenario is unavailable", async () => {
    const ctx = createContext();
    findPromptMenuItemMock.mockResolvedValue(null);

    await openScenarioBySlug(ctx, "recipes", "recipe-from-ingredients");

    expect(ctx.reply).toHaveBeenCalledWith(
      "Этот сценарий сейчас недоступен. Откройте меню и выберите другой.",
    );
  });

  it("replies with readable Russian text when the menu has no active scenarios", async () => {
    const ctx = createContext();

    await openMainMenu(ctx);

    expect(ctx.reply.mock.calls[0]?.[0]).toBe(
      "Сейчас нет активных сценариев. Напишите администратору.",
    );
  });

  it("replies with readable Russian text when no photo styles are active", async () => {
    const ctx = createContext();

    await openScenarioFromItem(ctx, {
      feature: "photoshoot-pick-style",
      slug: "pick-style",
      title: " ! Q � Q ! U! U",
    });

    expect(ctx.reply.mock.calls[1]?.[0]).toBe("Нет активных стилей. Создайте стили в админке.");
  });

  it("replies with readable Russian text before showing active photo styles", async () => {
    const ctx = createContext();
    prismaMock.photoStyle.findMany.mockResolvedValue([{ id: "style_1", name: " Y �! �" }]);

    await openScenarioFromItem(ctx, {
      feature: "photoshoot-pick-style",
      slug: "pick-style",
      title: " ! Q � Q ! U! U",
    });

    expect(ctx.reply.mock.calls[1]).toEqual([
      "Выберите визуальный стиль для обработки фото:",
      {
        reply_markup: {
          inline_keyboard: [[{ callback_data: "photoshoot-style:style_1", text: " Y �! �" }]],
        },
      },
    ]);
  });

  it("sends local menu preview images as Telegram files", async () => {
    const ctx = createContext();

    await openScenarioFromItem(ctx, {
      feature: "recipes",
      previewImageUrl: "/uploads/admin/triggers/recipes-card.jpg",
      slug: "recipe-from-ingredients",
      title: "Рецепты",
    });

    expect(ctx.replyWithPhoto).toHaveBeenCalledWith(expect.any(InputFile), {
      caption: expect.any(String),
    });
  });

  it("sends the expired tariff image as a Telegram file", async () => {
    const ctx = createContext();

    await sendExpiredTariffMessage(ctx, "123");

    expect(ctx.replyWithPhoto).toHaveBeenCalledWith(expect.any(InputFile), {
      caption: "Оплатите тариф",
      reply_markup: { inline_keyboard: [] },
    });
  });

  it("sends a YooKassa payment link when a user chooses the Konditer tariff", async () => {
    const ctx = createContext();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_123" });
    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        confirmationUrl: "https://pay.example/confirm",
      }),
      ok: true,
    });

    await handleTariffPurchase(ctx, {
      tariffSlug: "basic",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://pastry.example.com/api/payments/yookassa/create",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
    ).toEqual({
      returnUrl: "https://pastry.example.com/payments/return",
      tariffSlug: "basic",
      userId: "user_123",
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      "Оплатить тариф можно по кнопке ниже:",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "Оплатить тариф", url: "https://pay.example/confirm" }]],
        },
      },
    );
  });

  it("sends a friendly Russian error when YooKassa link creation fails", async () => {
    const ctx = createContext();
    prismaMock.user.findFirst.mockResolvedValue({ id: "user_123" });
    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: "boom" }),
      ok: false,
    });

    await handleTariffPurchase(ctx, {
      tariffSlug: "basic",
    });

    expect(ctx.reply).toHaveBeenCalledWith(
      "Не удалось создать ссылку на оплату. Попробуйте ещё раз чуть позже.",
    );
  });
});
