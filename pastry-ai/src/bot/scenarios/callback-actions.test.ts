import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeBotCommandActionMock,
  handleTariffPurchaseMock,
  openMainMenuMock,
  prismaMock,
} = vi.hoisted(() => ({
  executeBotCommandActionMock: vi.fn(),
  handleTariffPurchaseMock: vi.fn(),
  openMainMenuMock: vi.fn(),
  prismaMock: {
    scenarioButton: {
      findUnique: vi.fn(),
    },
    scenarioStep: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../command-actions", () => ({
  executeBotCommandAction: executeBotCommandActionMock,
  handleTariffPurchase: handleTariffPurchaseMock,
  openMainMenu: openMainMenuMock,
}));

import {
  handleScenarioButtonCallback,
  parseScenarioCallback,
} from "./callback-actions";
import type { PastryBotContext } from "../context";

type TestContext = PastryBotContext & {
  answerCallbackQuery: ReturnType<typeof vi.fn>;
  deleteMessage: ReturnType<typeof vi.fn>;
  editMessageCaption: ReturnType<typeof vi.fn>;
  editMessageMedia: ReturnType<typeof vi.fn>;
  editMessageReplyMarkup: ReturnType<typeof vi.fn>;
  editMessageText: ReturnType<typeof vi.fn>;
  reply: ReturnType<typeof vi.fn>;
  replyWithPhoto: ReturnType<typeof vi.fn>;
};

function ctxFor(
  callbackData: string,
  message: Record<string, unknown> = { message_id: 10, text: "Current step" },
): TestContext {
  return {
    answerCallbackQuery: vi.fn().mockResolvedValue(undefined),
    api: {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendPhoto: vi.fn().mockResolvedValue(undefined),
    },
    callbackQuery: { data: callbackData, message },
    chat: { id: 123 },
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    editMessageCaption: vi.fn().mockResolvedValue(undefined),
    editMessageMedia: vi.fn().mockResolvedValue(undefined),
    editMessageReplyMarkup: vi.fn().mockResolvedValue(undefined),
    editMessageText: vi.fn().mockResolvedValue(undefined),
    from: { id: 123 },
    reply: vi.fn().mockResolvedValue(undefined),
    replyWithPhoto: vi.fn().mockResolvedValue(undefined),
    session: {},
  } as unknown as TestContext;
}

function buttonRecord(
  overrides: Partial<{
    actionType: string;
    actionValue: string | null;
    id: string;
    transitionMode: string | null;
  }> = {},
) {
  return {
    actionType: "SCENARIO_STEP",
    actionValue: "step_next",
    id: "button_next",
    step: { id: "step_start" },
    transitionMode: "SEND_NEW",
    ...overrides,
  };
}

function stepRecord(overrides: Record<string, unknown> = {}) {
  return {
    buttons: [],
    id: "step_next",
    imageUrl: null,
    messageText: "Next step",
    ...overrides,
  };
}

describe("parseScenarioCallback", () => {
  it("resolves flow callback ids from callback_data", () => {
    expect(parseScenarioCallback("flow:button_1")).toBe("button_1");
    expect(parseScenarioCallback("menu:return")).toBeNull();
  });
});

describe("handleScenarioButtonCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeBotCommandActionMock.mockResolvedValue(undefined);
    openMainMenuMock.mockResolvedValue(undefined);
    prismaMock.scenarioButton.findUnique.mockResolvedValue(null);
    prismaMock.scenarioStep.findUnique.mockResolvedValue(null);
  });

  it("dispatches BOT_COMMAND scenario buttons through shared command handlers", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({
        actionType: "BOT_COMMAND",
        actionValue: "/recipe",
        id: "button_recipe",
        transitionMode: null,
      }),
    );
    const ctx = ctxFor("flow:button_recipe");

    await handleScenarioButtonCallback(ctx);

    expect(prismaMock.scenarioButton.findUnique).toHaveBeenCalledWith({
      include: { step: true },
      where: { id: "button_recipe" },
    });
    expect(executeBotCommandActionMock).toHaveBeenCalledWith(
      expect.anything(),
      "/recipe",
    );
  });

  it("opens the main menu for MAIN_MENU scenario buttons", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({
        actionType: "MAIN_MENU",
        actionValue: null,
        id: "button_menu",
        transitionMode: null,
      }),
    );
    const ctx = ctxFor("flow:button_menu");

    await handleScenarioButtonCallback(ctx);

    expect(openMainMenuMock).toHaveBeenCalledWith(ctx);
  });

  it("dispatches TARIFF_PURCHASE scenario buttons through tariff payment handler", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({
        actionType: "TARIFF_PURCHASE",
        actionValue: "pastry-chef",
        id: "button_tariff",
        transitionMode: null,
      }),
    );
    const ctx = ctxFor("flow:button_tariff");
    handleTariffPurchaseMock.mockResolvedValue("https://pay.example/confirm");

    await handleScenarioButtonCallback(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: "Создаём ссылку на оплату…",
    });
    expect(handleTariffPurchaseMock).toHaveBeenCalledWith(ctx, {
      tariffSlug: "basic",
    });
    expect(ctx.editMessageReplyMarkup).toHaveBeenCalledWith({
      reply_markup: { inline_keyboard: [[{ text: "💳 Оплатить", url: "https://pay.example/confirm" }]] },
    });
  });

  it("sends the next scenario step as a new message when transition mode is SEND_NEW", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(buttonRecord());
    prismaMock.scenarioStep.findUnique.mockResolvedValue(
      stepRecord({
        buttons: [
          {
            actionType: "MAIN_MENU",
            actionValue: null,
            id: "button_menu",
            sortOrder: 0,
            stepId: "step_next",
            text: "Menu",
            transitionMode: null,
          },
        ],
      }),
    );
    const ctx = ctxFor("flow:button_next");

    await handleScenarioButtonCallback(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Next step", {
      reply_markup: {
        inline_keyboard: [[{ callback_data: "flow:button_menu", text: "Menu" }]],
      },
    });
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it("replaces a text message with editMessageText when the next step is also text", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({ transitionMode: "REPLACE_CURRENT" }),
    );
    prismaMock.scenarioStep.findUnique.mockResolvedValue(stepRecord());
    const ctx = ctxFor("flow:button_next");

    await handleScenarioButtonCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledWith("Next step", {
      reply_markup: undefined,
    });
    expect(ctx.deleteMessage).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("falls back to delete and send when Telegram rejects text replacement", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({ transitionMode: "REPLACE_CURRENT" }),
    );
    prismaMock.scenarioStep.findUnique.mockResolvedValue(stepRecord());
    const ctx = ctxFor("flow:button_next");
    ctx.editMessageText.mockRejectedValue(new Error("Bad Request: message is not modified"));

    await handleScenarioButtonCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledWith("Next step", {
      reply_markup: undefined,
    });
    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Next step", {
      reply_markup: undefined,
    });
  });

  it("replaces a photo message with editMessageMedia when the next step is also a photo", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({ transitionMode: "REPLACE_CURRENT" }),
    );
    prismaMock.scenarioStep.findUnique.mockResolvedValue(
      stepRecord({ imageUrl: "https://example.com/next.jpg" }),
    );
    const ctx = ctxFor("flow:button_next", {
      caption: "Current photo",
      message_id: 10,
      photo: [{ file_id: "photo_1" }],
    });

    await handleScenarioButtonCallback(ctx);

    expect(ctx.editMessageMedia).toHaveBeenCalledWith(
      {
        caption: "Next step",
        media: "https://example.com/next.jpg",
        type: "photo",
      },
      { reply_markup: undefined },
    );
    expect(ctx.deleteMessage).not.toHaveBeenCalled();
    expect(ctx.replyWithPhoto).not.toHaveBeenCalled();
  });

  it("falls back to delete and send when replacing text with a photo step", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({ transitionMode: "REPLACE_CURRENT" }),
    );
    prismaMock.scenarioStep.findUnique.mockResolvedValue(
      stepRecord({ imageUrl: "https://example.com/next.jpg" }),
    );
    const ctx = ctxFor("flow:button_next", {
      message_id: 10,
      text: "Current text",
    });

    await handleScenarioButtonCallback(ctx);

    expect(ctx.editMessageMedia).not.toHaveBeenCalled();
    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(ctx.replyWithPhoto).toHaveBeenCalledWith(
      "https://example.com/next.jpg",
      {
        caption: "Next step",
        reply_markup: undefined,
      },
    );
  });

  it("falls back to delete and send when replacing a photo with a text step", async () => {
    prismaMock.scenarioButton.findUnique.mockResolvedValue(
      buttonRecord({ transitionMode: "REPLACE_CURRENT" }),
    );
    prismaMock.scenarioStep.findUnique.mockResolvedValue(stepRecord());
    const ctx = ctxFor("flow:button_next", {
      caption: "Current photo",
      message_id: 10,
      photo: [{ file_id: "photo_1" }],
    });

    await handleScenarioButtonCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.deleteMessage).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Next step", {
      reply_markup: undefined,
    });
  });

  it("validates the callback id against the DB before running an action", async () => {
    const ctx = ctxFor("flow:missing_button");

    await handleScenarioButtonCallback(ctx);

    expect(executeBotCommandActionMock).not.toHaveBeenCalled();
    expect(openMainMenuMock).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: "Этот переход больше недоступен.",
    });
  });
});
