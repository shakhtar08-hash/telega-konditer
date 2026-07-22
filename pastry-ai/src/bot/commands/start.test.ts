import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildExpiredTariffKeyboardMock,
  buildOnboardingKeyboardMock,
  buildPromptMenuKeyboardMock,
  buildPromptMenuMessageMock,
  createTriggerServiceMock,
  getOnboardingStepMock,
  handleTariffPurchaseMock,
  handleTriggerEventMock,
  loadExpiredTariffStepMock,
  loadOnboardingStepsMock,
  loadPromptMenuItemsMock,
  prismaMock,
  sendScenarioStepMock,
  userHasPromptAccessMock,
} = vi.hoisted(() => ({
  buildExpiredTariffKeyboardMock: vi.fn(),
  buildOnboardingKeyboardMock: vi.fn(),
  buildPromptMenuKeyboardMock: vi.fn(),
  buildPromptMenuMessageMock: vi.fn(),
  createTriggerServiceMock: vi.fn(),
  getOnboardingStepMock: vi.fn(),
  handleTariffPurchaseMock: vi.fn(),
  handleTriggerEventMock: vi.fn(),
  loadExpiredTariffStepMock: vi.fn(),
  loadOnboardingStepsMock: vi.fn(),
  loadPromptMenuItemsMock: vi.fn(),
  sendScenarioStepMock: vi.fn(),
  prismaMock: {
    scheduledMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    scenario: {
      findUnique: vi.fn(),
    },
    triggerRule: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
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

vi.mock("@/features/triggers/trigger-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/triggers/trigger-service")
  >();

  return {
    ...actual,
    createTriggerService: (
      deps: Parameters<typeof actual.createTriggerService>[0],
    ) => {
      createTriggerServiceMock(deps);
      return actual.createTriggerService(deps);
    },
  };
});

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
  ) => Promise<unknown>;
};

vi.mock("@/features/triggers/trigger-event-service", () => ({
  createTriggerEventService: (deps: TriggerSchedulerDeps) => ({
    handleTriggerEvent: async (
      eventKey: string,
      payload: { chatId: string; userId?: string },
    ) => {
      handleTriggerEventMock(eventKey, payload);
      await deps.scheduleTrigger(eventKey, payload.chatId, {
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        generationCount: 0,
        groupIds: [],
        hasActiveTariff: false,
        lastActivityAt: null,
        plan: "FREE",
        promoClaimed: false,
        remainingTokens: 0,
        tariffExpired: false,
      });
    },
  }),
}));

vi.mock("@/features/triggers/trigger-user-state", () => ({
  loadTriggerUserState: vi.fn(),
}));

vi.mock("@/features/triggers/scenario-step-renderer", () => ({
  buildScenarioReplyMarkup: vi.fn(),
  sendScenarioStep: sendScenarioStepMock,
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
  buildExpiredTariffKeyboard: buildExpiredTariffKeyboardMock,
  buildOnboardingKeyboard: buildOnboardingKeyboardMock,
  buildPaymentUrl: vi.fn(),
  getOnboardingStep: getOnboardingStepMock,
  isPublicAppBaseUrl: vi.fn(() => false),
  loadExpiredTariffStep: loadExpiredTariffStepMock,
  loadOnboardingSteps: loadOnboardingStepsMock,
  migrateLegacyStep: (step: unknown) => step,
  resolveBuyButtonUrl: vi.fn(),
}));

vi.mock("../command-actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../command-actions")>();

  return {
    ...actual,
    handleTariffPurchase: handleTariffPurchaseMock,
  };
});

import {
  buildPhotoStyleKeyboard,
  buildStartMessage,
  registerStartCommand,
} from "./start";
import { findBotMenuItem } from "../prompt-menu";

type BaseContext = ReturnType<typeof createBaseContext>;
type TestHandlerContext = Omit<BaseContext, "chat"> & {
  chat?: BaseContext["chat"];
  answerCallbackQuery?: ReturnType<typeof vi.fn>;
  match?: string[];
};
type TestHandler = (ctx: TestHandlerContext) => Promise<void>;
type TestComposer = Parameters<typeof registerStartCommand>[0];
type MockedBotMenuItem = Awaited<ReturnType<typeof findBotMenuItem>>;

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
    api: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendPhoto: vi.fn().mockResolvedValue(undefined),
    },
    chat: {
      id: 123,
      type: "private",
    },
    from: {
      first_name: "Roof",
      id: 123,
      last_name: null,
      username: "roof09",
    },
    reply: vi.fn().mockResolvedValue(undefined),
    session: {},
  } as unknown as {
    api: {
      sendMessage: ReturnType<typeof vi.fn>;
      sendPhoto: ReturnType<typeof vi.fn>;
    };
    chat: {
      id: number;
      type: string;
    };
    from: {
      first_name: string;
      id: number;
      last_name: null;
      username: string;
    };
    reply: ReturnType<typeof vi.fn>;
    session: Record<string, unknown>;
  };
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
    prismaMock.user.findFirst.mockResolvedValue({ id: "user-1" });
    prismaMock.user.update.mockResolvedValue({ id: "user-1", promoClaimed: true });
    prismaMock.userTariff.findUnique.mockResolvedValue({
      tariffPlan: { slug: "promo" },
    });
    prismaMock.triggerRule.findMany.mockResolvedValue([]);
    prismaMock.scheduledMessage.findFirst.mockResolvedValue(null);
    prismaMock.scheduledMessage.create.mockResolvedValue({
      buttons: null,
      chatId: "123",
      createdAt: new Date("2026-07-18T10:00:00.000Z"),
      id: "scheduled_1",
      imageUrl: null,
      scenarioId: null,
      scenarioStepId: null,
      sendAt: new Date("2026-07-18T10:00:00.000Z"),
      sentAt: null,
      text: "",
      triggeredAt: new Date("2026-07-18T10:00:00.000Z"),
      triggerEventKey: "user.started",
      triggerRuleId: "rule_1",
    });
    getOnboardingStepMock.mockReturnValue({ nextAction: "next" });
    buildExpiredTariffKeyboardMock.mockReturnValue({
      inline_keyboard: [
        [{ callback_data: "try_free", text: "Попробовать бесплатно" }],
        [{ callback_data: "tariff:buy:basic", text: "Кондитер" }],
      ],
    });
    buildOnboardingKeyboardMock.mockReturnValue({
      inline_keyboard: [[{ callback_data: "onboarding:1", text: "Далее" }]],
    });
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
    sendScenarioStepMock.mockResolvedValue(undefined);
  });

  it("opens the main menu after try_free activates promo", async () => {
    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
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
    expect(handleTriggerEventMock).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("shows expired tariff purchase as a callback button in the live bot flow", async () => {
    userHasPromptAccessMock.mockResolvedValue(false);

    const commandHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn(),
      command: vi.fn((name, handler) => {
        commandHandlers.set(name, handler);
      }),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = createBaseContext();

    registerStartCommand(composer, userService);

    await commandHandlers.get("menu")?.(ctx);

    expect(ctx.reply).toHaveBeenCalledWith("Оплатите тариф", {
      reply_markup: {
        inline_keyboard: [
          [{ callback_data: "try_free", text: "Попробовать бесплатно" }],
          [{ callback_data: "tariff:buy:basic", text: "Кондитер" }],
        ],
      },
    });
  });

  it("routes tariff purchase callbacks to handleTariffPurchase", async () => {
    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        callbackHandlers.set(String(pattern), handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      match: ["tariff:buy:pastry-chef", "pastry-chef"],
    };

    registerStartCommand(composer, userService);

    const tariffHandler = Array.from(callbackHandlers.entries()).find(
      ([key]) => key.includes("tariff:buy:"),
    )?.[1];

    await tariffHandler?.(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(handleTariffPurchaseMock).toHaveBeenCalledWith(ctx, {
      tariffSlug: "basic",
    });
  });

  it("does not dispatch user.started from try_free", async () => {
    handleTriggerEventMock.mockRejectedValueOnce(new Error("trigger failed"));

    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    };

    registerStartCommand(composer, userService);

    await expect(
      callbackHandlers.get("try_free")?.(ctx),
    ).resolves.toBeUndefined();

    expect(userService.assignPromoTariff).toHaveBeenCalledWith("user-1");
    expect(handleTriggerEventMock).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("dispatches user.started on /start when promo access is already active", async () => {
    const commandHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn(),
      command: vi.fn((name, handler) => {
        commandHandlers.set(name, handler);
      }),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = createBaseContext();

    registerStartCommand(composer, userService);

    await commandHandlers.get("start")?.(ctx);

    expect(userService.registerTelegramUser).toHaveBeenCalledWith({
      name: "Roof",
      telegramId: "123",
      username: "roof09",
    });
    expect(handleTriggerEventMock).toHaveBeenCalledWith("user.started", {
      chatId: "123",
      userId: "user-1",
    });
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("loads scenario start steps before scheduling user.started scenario triggers", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    prismaMock.triggerRule.findMany.mockResolvedValue([
      {
        buttons: null,
        conditions: [],
        createdAt: new Date("2026-07-18T10:00:00.000Z"),
        delayUnit: "hours",
        delayValue: 1,
        deliveryType: "SCENARIO",
        eventKey: "user.started",
        id: "rule_scenario",
        imageUrl: null,
        messageText: "",
        name: "Start flow",
        scenario: { startStepId: "step_start" },
        scenarioId: "scenario_1",
        status: "active",
        updatedAt: new Date("2026-07-18T10:00:00.000Z"),
      },
    ]);

    const commandHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn(),
      command: vi.fn((name, handler) => {
        commandHandlers.set(name, handler);
      }),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = createBaseContext();

    registerStartCommand(composer, userService);

    await commandHandlers.get("start")?.(ctx);

    expect(prismaMock.triggerRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          scenario: {
            select: { startStepId: true },
          },
        },
      }),
    );
    expect(prismaMock.scheduledMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scenarioId: "scenario_1",
        scenarioStepId: "step_start",
        text: "",
      }),
    });
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      "Failed to dispatch user.started trigger event",
      expect.anything(),
    );

    consoleErrorSpy.mockRestore();
  });

  it("starts a selected scenario from a SCENARIO menu button", async () => {
    vi.mocked(findBotMenuItem).mockResolvedValue({
      actionType: "SCENARIO",
      description: "Welcome flow",
      feature: "scenario",
      id: "button_scenario",
      scenarioId: "scenario_1",
      slug: "scenario_1",
      title: "Сценарий приветствия",
    } as unknown as MockedBotMenuItem);
    prismaMock.scenario.findUnique.mockResolvedValue({
      id: "scenario_1",
      startStepId: "step_start",
    });
    prismaMock.userTariff.findUnique.mockResolvedValue(null);

    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        callbackHandlers.set(String(pattern), handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      match: ["menu:button_scenario", "button_scenario"],
    };

    registerStartCommand(composer, userService);

    const menuHandler = Array.from(callbackHandlers.entries()).find(
      ([key]) => key.includes("menu:(.+)"),
    )?.[1];

    await menuHandler?.(ctx);

    expect(prismaMock.scenario.findUnique).toHaveBeenCalledWith({
      select: { startStepId: true },
      where: { id: "scenario_1" },
    });
    expect(sendScenarioStepMock).toHaveBeenCalledWith(ctx, "123", "step_start");
  });

  it("opens the main menu on /menu without dispatching user.started", async () => {
    const commandHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn(),
      command: vi.fn((name, handler) => {
        commandHandlers.set(name, handler);
      }),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = createBaseContext();

    registerStartCommand(composer, userService);

    await commandHandlers.get("menu")?.(ctx);

    expect(userService.registerTelegramUser).toHaveBeenCalledWith({
      name: "Roof",
      telegramId: "123",
      username: "roof09",
    });
    expect(handleTriggerEventMock).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("opens the main menu from menu:return without dispatching user.started", async () => {
    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
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
    expect(handleTriggerEventMock).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("falls back to api.sendMessage from menu:return when callback context has no chat", async () => {
    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        if (typeof pattern === "string") callbackHandlers.set(pattern, handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
    const userService = createUserService();
    const ctx = {
      ...createBaseContext(),
      answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
      chat: undefined,
    };

    registerStartCommand(composer, userService);

    await callbackHandlers.get("menu:return")?.(ctx);

    expect(ctx.api.sendMessage).toHaveBeenCalledWith(123, "Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });

  it("opens the main menu after onboarding promo activation without dispatching user.started", async () => {
    loadOnboardingStepsMock.mockResolvedValue([
      { nextAction: "next" },
      { nextAction: "activate_promo_and_next" },
    ]);
    getOnboardingStepMock.mockReturnValue({
      nextAction: "activate_promo_and_next",
    });

    const callbackHandlers = new Map<string, TestHandler>();
    const composer = {
      callbackQuery: vi.fn((pattern, handler) => {
        callbackHandlers.set(String(pattern), handler);
      }),
      command: vi.fn(),
    } as unknown as TestComposer;
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
    expect(handleTriggerEventMock).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Главное меню", {
      reply_markup: menuReplyMarkup,
    });
  });
});
