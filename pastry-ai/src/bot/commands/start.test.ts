import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildPromptMenuKeyboardMock,
  buildPromptMenuMessageMock,
  getOnboardingStepMock,
  handleTriggerEventMock,
  loadOnboardingStepsMock,
  loadPromptMenuItemsMock,
  prismaMock,
  userHasPromptAccessMock,
} = vi.hoisted(() => ({
  buildPromptMenuKeyboardMock: vi.fn(),
  buildPromptMenuMessageMock: vi.fn(),
  getOnboardingStepMock: vi.fn(),
  handleTriggerEventMock: vi.fn(),
  loadOnboardingStepsMock: vi.fn(),
  loadPromptMenuItemsMock: vi.fn(),
  prismaMock: {
    scheduledMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    triggerRule: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userTariff: {
      findUnique: vi.fn(),
    },
  },
  userHasPromptAccessMock: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
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

vi.mock("../access", () => ({
  userHasPromptAccess: userHasPromptAccessMock,
}));

vi.mock("../prompt-menu", () => ({
  buildPromptMenuKeyboard: buildPromptMenuKeyboardMock,
  buildPromptMenuMessage: buildPromptMenuMessageMock,
  findBotMenuItem: vi.fn(),
  findPromptMenuItem: vi.fn(),
  getPromptSelectionText: vi.fn(),
  loadPromptMenuItems: loadPromptMenuItemsMock,
}));

vi.mock("../context", () => ({
  clearScenarioSession: vi.fn(),
  setActivePrompt: vi.fn(),
}));

vi.mock("../menu-return", () => ({
  MENU_RETURN_CALLBACK: "menu:return",
}));

vi.mock("../onboarding", () => ({
  buildExpiredTariffKeyboard: vi.fn(),
  buildOnboardingKeyboard: vi.fn(),
  buildPaymentUrl: vi.fn(),
  getOnboardingStep: getOnboardingStepMock,
  isPublicAppBaseUrl: vi.fn(() => false),
  loadExpiredTariffStep: vi.fn(),
  loadOnboardingSteps: loadOnboardingStepsMock,
  migrateLegacyStep: (step: unknown) => step,
  resolveBuyButtonUrl: vi.fn(),
}));

import {
  buildPhotoStyleKeyboard,
  buildStartMessage,
  registerStartCommand,
} from "./start";

const menuReplyMarkup = {
  inline_keyboard: [[{ callback_data: "menu:button_recipe", text: "Создать рецепт" }]],
};

function createUserService() {
  return {
    assignPromoTariff: vi.fn().mockResolvedValue(undefined),
    registerTelegramUser: vi.fn().mockResolvedValue({
      id: "user-1",
      name: "Roof",
      plan: "FREE",
      telegramId: "123",
    }),
  };
}

function createBaseContext() {
  return {
    from: {
      first_name: "Roof",
      id: 123,
      last_name: null,
      username: "roof09",
    },
    reply: vi.fn().mockResolvedValue(undefined),
    session: {},
  } as any;
}

describe("buildStartMessage", () => {
  it("welcomes users by name", () => {
    expect(buildStartMessage("Chef")).toContain("Chef");
    expect(buildStartMessage("Chef")).toContain("Привет");
  });
});

describe("buildPhotoStyleKeyboard", () => {
  it("groups style buttons two per row", () => {
    const keyboard = buildPhotoStyleKeyboard([
      { id: "1", name: "Korean Cafe" },
      { id: "2", name: "Japanese" },
      { id: "3", name: "Coffee Mood" },
      { id: "4", name: "Royal" },
      { id: "5", name: "Wedding" },
    ]);

    expect(keyboard).toHaveLength(3);
    expect(keyboard[0]?.map((button) => button.text)).toEqual([
      "Korean Cafe",
      "Japanese",
    ]);
    expect(keyboard[1]?.map((button) => button.text)).toEqual([
      "Coffee Mood",
      "Royal",
    ]);
    expect(keyboard[2]?.map((button) => button.text)).toEqual(["Wedding"]);
  });
});

describe("registerStartCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1" });
    prismaMock.user.update.mockResolvedValue({ id: "user-1", promoClaimed: true });
    prismaMock.userTariff.findUnique.mockResolvedValue({
      tariffPlan: { slug: "promo" },
    });
    getOnboardingStepMock.mockReturnValue({ nextAction: "next" });
    loadOnboardingStepsMock.mockResolvedValue([]);
    userHasPromptAccessMock.mockResolvedValue(true);
    loadPromptMenuItemsMock.mockResolvedValue([
      {
        feature: "recipes",
        id: "button_recipe",
        slug: "recipe-from-ingredients",
        title: "Создать рецепт",
      },
    ]);
    buildPromptMenuMessageMock.mockResolvedValue("Главное меню");
    buildPromptMenuKeyboardMock.mockReturnValue(menuReplyMarkup);
    handleTriggerEventMock.mockResolvedValue(undefined);
  });

  it("opens the main menu after try_free activates promo", async () => {
    const callbackHandlers = new Map<string, (ctx: any) => Promise<void>>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as any;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    };

    registerStartCommand(composer, userService);

    await callbackHandlers.get("try_free")?.(ctx);

    expect(userService.assignPromoTariff).toHaveBeenCalledWith("user-1");
    expect(userService.registerTelegramUser).toHaveBeenCalledWith({
      name: "Roof",
      telegramId: "123",
      username: "roof09",
    });
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("still opens the main menu after try_free when user.started trigger dispatch fails", async () => {
    handleTriggerEventMock.mockRejectedValueOnce(new Error("trigger failed"));

    const callbackHandlers = new Map<string, (ctx: any) => Promise<void>>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as any;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    };

    registerStartCommand(composer, userService);

    await expect(callbackHandlers.get("try_free")?.(ctx)).resolves.toBeUndefined();

    expect(userService.assignPromoTariff).toHaveBeenCalledWith("user-1");
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("opens the main menu on /start when promo access is already active", async () => {
    const commandHandlers = new Map<string, (ctx: any) => Promise<void>>();
    const composer = {
      callbackQuery: vi.fn(),
      command: vi.fn((name, handler) => {
        commandHandlers.set(name, handler);
      }),
    } as any;
    const userService = createUserService();
    const ctx = createBaseContext();

    registerStartCommand(composer, userService);

    await commandHandlers.get("start")?.(ctx);

    expect(userService.registerTelegramUser).toHaveBeenCalledWith({
      name: "Roof",
      telegramId: "123",
      username: "roof09",
    });
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("opens the main menu on /menu when promo access is already active", async () => {
    const commandHandlers = new Map<string, (ctx: any) => Promise<void>>();
    const composer = {
      callbackQuery: vi.fn(),
      command: vi.fn((name, handler) => {
        commandHandlers.set(name, handler);
      }),
    } as any;
    const userService = createUserService();
    const ctx = createBaseContext();

    registerStartCommand(composer, userService);

    await commandHandlers.get("menu")?.(ctx);

    expect(userService.registerTelegramUser).toHaveBeenCalledWith({
      name: "Roof",
      telegramId: "123",
      username: "roof09",
    });
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("opens the main menu from menu:return using the registered user id", async () => {
    const callbackHandlers = new Map<string, (ctx: any) => Promise<void>>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as any;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    };

    registerStartCommand(composer, userService);

    await callbackHandlers.get("menu:return")?.(ctx);

    expect(userService.registerTelegramUser).toHaveBeenCalledWith({
      name: "Roof",
      telegramId: "123",
      username: "roof09",
    });
    expect(userHasPromptAccessMock).toHaveBeenCalledWith("user-1");
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("opens the main menu after onboarding promo activation", async () => {
    loadOnboardingStepsMock.mockResolvedValue([
      { nextAction: "next" },
      { nextAction: "activate_promo_and_next" },
    ]);
    getOnboardingStepMock.mockReturnValue({
      nextAction: "activate_promo_and_next",
    });

    const callbackHandlers = new Map<string, (ctx: any) => Promise<void>>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        callbackHandlers.set(String(pattern), handler);
      }),
      command: vi.fn(),
    } as any;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      match: ["onboarding:2", "2"],
    };

    registerStartCommand(composer, userService);

    const onboardingHandler = Array.from(callbackHandlers.entries()).find(
      ([key]) => key.includes("onboarding:"),
    )?.[1];

    await onboardingHandler?.(ctx);

    expect(userService.assignPromoTariff).toHaveBeenCalledWith("user-1");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { promoClaimed: true },
    });
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });
});
