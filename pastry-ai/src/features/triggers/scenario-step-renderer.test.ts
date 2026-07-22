import { InputFile } from "grammy";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.hoisted(() => vi.fn());
const sendMessageMock = vi.hoisted(() => vi.fn());
const sendPhotoMock = vi.hoisted(() => vi.fn());
const resolveTelegramPhotoInputMock = vi.hoisted(() => vi.fn());

vi.mock("@/db/prisma", () => ({
  prisma: {
    scenarioStep: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/bot/telegram-media", () => ({
  resolveTelegramPhotoInput: resolveTelegramPhotoInputMock,
}));

import {
  buildScenarioReplyMarkup,
  sendScenarioStep,
} from "./scenario-step-renderer";
import { createTriggerService } from "./trigger-service";
import type { TriggerRuleRecord, TriggerUserState } from "./trigger-rule-types";

const baseState: TriggerUserState = {
  plan: "FREE",
  promoClaimed: false,
  hasActiveTariff: false,
  generationCount: 0,
  groupIds: [],
  remainingTokens: 0,
  tariffExpired: false,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  lastActivityAt: null,
};

const baseRule: TriggerRuleRecord = {
  id: "rule_1",
  name: "After Start: no promo",
  eventKey: "user.started",
  status: "active",
  delayValue: 15,
  delayUnit: "minutes",
  deliveryType: "MESSAGE",
  scenarioId: null,
  messageText: "Hello!",
  imageUrl: null,
  buttons: null,
  conditions: [],
};

describe("buildScenarioReplyMarkup", () => {
  it("renders scenario buttons into a Telegram keyboard", () => {
    const markup = buildScenarioReplyMarkup([
      {
        id: "button_1",
        stepId: "step_1",
        text: "Next",
        sortOrder: 0,
        actionType: "SCENARIO_STEP",
        actionValue: "step_2",
        transitionMode: "SEND_NEW",
      },
    ]);

    const button = markup?.inline_keyboard[0]?.[0];

    expect(button).toHaveProperty("callback_data");
    if (!button || !("callback_data" in button)) {
      throw new Error("Expected a callback button");
    }
    expect(button.callback_data).toContain("flow:");
    expect(button.callback_data).toBe("flow:button_1");
  });

  it("preserves URL buttons as Telegram URL buttons", () => {
    const markup = buildScenarioReplyMarkup([
      {
        id: "button_url",
        stepId: "step_1",
        text: "Open",
        sortOrder: 0,
        actionType: "URL",
        actionValue: "https://example.com",
        transitionMode: null,
      },
    ]);

    expect(markup?.inline_keyboard[0]?.[0]).toEqual({
      text: "Open",
      url: "https://example.com/",
    });
  });

  it("resolves templated and relative URL buttons against runtime context", () => {
    process.env.APP_BASE_URL = "https://bot.example.com";

    const markup = buildScenarioReplyMarkup(
      [
        {
          id: "button_url",
          stepId: "step_1",
          text: "Pay",
          sortOrder: 0,
          actionType: "URL",
          actionValue: "{{baseUrl}}/pay?telegramId={{telegramId}}",
          transitionMode: null,
        },
      ],
      { telegramId: "12345" },
    );

    expect(markup?.inline_keyboard[0]?.[0]).toEqual({
      text: "Pay",
      url: "https://bot.example.com/pay?telegramId=12345",
    });
  });

  it("renders tariff purchase buttons as callback buttons", () => {
    const markup = buildScenarioReplyMarkup([
      {
        id: "button_tariff",
        stepId: "step_1",
        text: "Оплатить",
        sortOrder: 0,
        actionType: "TARIFF_PURCHASE",
        actionValue: "pastry-chef",
        transitionMode: null,
      },
    ]);

    expect(markup?.inline_keyboard[0]?.[0]).toEqual({
      callback_data: "flow:button_tariff",
      text: "Оплатить",
    });
  });
});

describe("sendScenarioStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMessageMock.mockResolvedValue(undefined);
    sendPhotoMock.mockResolvedValue(undefined);
    resolveTelegramPhotoInputMock.mockImplementation(
      (value: string) => new InputFile(Buffer.from(value), "scenario.jpg"),
    );
  });

  it("loads and sends a scenario step with validated DB buttons", async () => {
    findUniqueMock.mockResolvedValue({
      id: "step_start",
      messageText: "Welcome to the flow",
      imageUrl: null,
      buttons: [
        {
          id: "button_next",
          stepId: "step_start",
          text: "Next",
          sortOrder: 0,
          actionType: "SCENARIO_STEP",
          actionValue: "step_2",
          transitionMode: "SEND_NEW",
        },
      ],
    });

    await sendScenarioStep(
      { api: { sendMessage: sendMessageMock, sendPhoto: sendPhotoMock } },
      "12345",
      "step_start",
    );

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "step_start" },
      }),
    );
    expect(sendMessageMock).toHaveBeenCalledWith("12345", "Welcome to the flow", {
      reply_markup: expect.objectContaining({
        inline_keyboard: [[expect.objectContaining({ callback_data: "flow:button_next" })]],
      }),
    });
    expect(sendPhotoMock).not.toHaveBeenCalled();
  });

  it("sends relative scenario images as Telegram files", async () => {
    process.env.APP_BASE_URL = "https://bot.example.com";
    findUniqueMock.mockResolvedValue({
      id: "step_offer",
      messageText: "Offer",
      imageUrl: "/uploads/admin/scenarios/offer.jpg",
      buttons: [],
    });

    await sendScenarioStep(
      { api: { sendMessage: sendMessageMock, sendPhoto: sendPhotoMock } },
      "12345",
      "step_offer",
    );

    expect(sendPhotoMock).toHaveBeenCalledWith(
      "12345",
      expect.any(InputFile),
      {
        caption: "Offer",
        reply_markup: undefined,
      },
    );
    expect(resolveTelegramPhotoInputMock).toHaveBeenCalledWith(
      "https://bot.example.com/uploads/admin/scenarios/offer.jpg",
    );
  });
});

describe("createTriggerService scenario scheduling", () => {
  it("queues scenario step references for SCENARIO delivery triggers", async () => {
    const createScheduledMock = vi.fn();
    const service = createTriggerService({
      findActiveRulesByEvent: vi.fn().mockResolvedValue([
        {
          ...baseRule,
          deliveryType: "SCENARIO",
          scenarioId: "scenario_1",
          startStepId: "step_start",
        },
      ]),
      createScheduled: createScheduledMock,
      findExistingScheduled: vi.fn().mockResolvedValue(null),
      findPendingScheduled: vi.fn(),
      markSent: vi.fn(),
    });
    const eventOccurredAt = new Date("2026-07-18T10:00:00Z");

    await service.scheduleTrigger("user.started", "123", baseState, eventOccurredAt);

    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioId: "scenario_1",
        scenarioStepId: "step_start",
        text: "",
        imageUrl: null,
        buttons: null,
      }),
    );
  });

  it("sends pending scenario rows through the scenario step sender", async () => {
    const sendMessageMock = vi.fn();
    const sendScenarioStepMock = vi.fn();
    const markSentMock = vi.fn();
    const service = createTriggerService({
      findActiveRulesByEvent: vi.fn(),
      createScheduled: vi.fn(),
      findExistingScheduled: vi.fn(),
      findPendingScheduled: vi.fn().mockResolvedValue([
        {
          id: "scheduled_1",
          triggerRuleId: "rule_1",
          triggerEventKey: "user.started",
          chatId: "123",
          scenarioId: "scenario_1",
          scenarioStepId: "step_start",
          text: "",
          imageUrl: null,
          buttons: null,
          triggeredAt: new Date("2026-07-18T10:00:00Z"),
          sendAt: new Date("2026-07-18T10:15:00Z"),
          sentAt: null,
          createdAt: new Date("2026-07-18T10:00:00Z"),
        },
      ]),
      markSent: markSentMock,
    });

    const sent = await service.processPendingTriggers(
      sendMessageMock,
      sendScenarioStepMock,
    );

    expect(sent).toBe(1);
    expect(sendScenarioStepMock).toHaveBeenCalledWith("123", "step_start");
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(markSentMock).toHaveBeenCalledWith("scheduled_1");
  });
});
