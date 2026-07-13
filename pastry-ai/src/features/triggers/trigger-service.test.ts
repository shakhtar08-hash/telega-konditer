import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeSendAt,
  evaluateConditions,
} from "./trigger-condition";
import type {
  TriggerRuleRecord,
  TriggerUserState,
} from "./trigger-rule-types";
import { createTriggerService } from "./trigger-service";

const baseState: TriggerUserState = {
  plan: "FREE",
  promoClaimed: false,
  hasActiveTariff: false,
  generationCount: 0,
  groupIds: [],
};

const baseRule: TriggerRuleRecord = {
  id: "rule_1",
  name: "After Start: no promo",
  eventKey: "user.started",
  status: "active",
  delayValue: 15,
  delayUnit: "minutes",
  messageText: "Hello!",
  imageUrl: null,
  buttons: null,
  conditions: [
    { field: "promoClaimed", operator: "is", value: false },
    { field: "hasActiveTariff", operator: "is", value: false },
  ],
};

describe("evaluateConditions", () => {
  it("returns true only when every condition matches the user state", () => {
    expect(evaluateConditions(baseRule.conditions, baseState)).toBe(true);

    expect(
      evaluateConditions(
        [
          ...baseRule.conditions,
          { field: "generationCount", operator: "equals", value: 1 },
        ],
        baseState,
      ),
    ).toBe(false);
  });

  it("supports numeric and group membership conditions", () => {
    expect(
      evaluateConditions(
        [
          { field: "generationCount", operator: "gte", value: 3 },
          { field: "groupId", operator: "contains", value: "vip" },
        ],
        {
          ...baseState,
          generationCount: 4,
          groupIds: ["vip", "promo-users"],
        },
      ),
    ).toBe(true);
  });
});

describe("computeSendAt", () => {
  it("supports immediate and delayed delivery units", () => {
    const triggeredAt = new Date("2026-07-13T10:00:00.000Z");

    expect(computeSendAt(triggeredAt, 0, "now")).toEqual(triggeredAt);
    expect(computeSendAt(triggeredAt, 15, "minutes")).toEqual(
      new Date("2026-07-13T10:15:00.000Z"),
    );
    expect(computeSendAt(triggeredAt, 2, "hours")).toEqual(
      new Date("2026-07-13T12:00:00.000Z"),
    );
    expect(computeSendAt(triggeredAt, 1, "days")).toEqual(
      new Date("2026-07-14T10:00:00.000Z"),
    );
  });
});

describe("createTriggerService", () => {
  const findActiveRulesByEventMock = vi.fn();
  const createScheduledMock = vi.fn();
  const findPendingScheduledMock = vi.fn();
  const markSentMock = vi.fn();
  const findExistingScheduledMock = vi.fn();

  const service = createTriggerService({
    findActiveRulesByEvent: findActiveRulesByEventMock,
    createScheduled: createScheduledMock,
    findPendingScheduled: findPendingScheduledMock,
    markSent: markSentMock,
    findExistingScheduled: findExistingScheduledMock,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules a rule only when all conditions pass", async () => {
    findActiveRulesByEventMock.mockResolvedValue([baseRule]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("user.started", "12345", baseState);

    expect(findActiveRulesByEventMock).toHaveBeenCalledWith("user.started");
    expect(createScheduledMock).toHaveBeenCalledTimes(1);
    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerRuleId: "rule_1",
        triggerEventKey: "user.started",
        chatId: "12345",
        text: "Hello!",
        imageUrl: null,
        buttons: null,
      }),
    );
  });

  it("skips scheduling when any condition fails", async () => {
    findActiveRulesByEventMock.mockResolvedValue([
      {
        ...baseRule,
        conditions: [
          { field: "promoClaimed", operator: "is", value: false },
          { field: "hasActiveTariff", operator: "is", value: true },
        ],
      },
    ]);

    await service.scheduleTrigger("user.started", "12345", baseState);

    expect(findExistingScheduledMock).not.toHaveBeenCalled();
    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("deduplicates by rule, chat, and event occurrence", async () => {
    const eventOccurredAt = new Date("2026-07-13T08:00:00.000Z");
    findActiveRulesByEventMock.mockResolvedValue([baseRule]);
    findExistingScheduledMock.mockResolvedValue({ id: "existing" });

    await service.scheduleTrigger(
      "user.started",
      "12345",
      baseState,
      eventOccurredAt,
    );

    expect(findExistingScheduledMock).toHaveBeenCalledWith(
      "rule_1",
      "12345",
      eventOccurredAt,
    );
    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("uses the event time to snapshot the message and compute sendAt", async () => {
    const eventOccurredAt = new Date("2026-07-13T10:00:00.000Z");
    findActiveRulesByEventMock.mockResolvedValue([
      {
        ...baseRule,
        imageUrl: "/promo.png",
        buttons: [{ text: "Open" }],
        delayValue: 2,
        delayUnit: "hours",
      },
    ]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger(
      "user.started",
      "12345",
      baseState,
      eventOccurredAt,
    );

    expect(createScheduledMock).toHaveBeenCalledWith({
      triggerRuleId: "rule_1",
      triggerEventKey: "user.started",
      chatId: "12345",
      text: "Hello!",
      imageUrl: "/promo.png",
      buttons: [{ text: "Open" }],
      triggeredAt: eventOccurredAt,
      sendAt: new Date("2026-07-13T12:00:00.000Z"),
    });
  });

  it("processes pending scheduled trigger messages", async () => {
    findPendingScheduledMock.mockResolvedValue([
      {
        id: "scheduled_1",
        triggerRuleId: "rule_1",
        triggerEventKey: "user.started",
        chatId: "12345",
        text: "Hello!",
        imageUrl: null,
        buttons: null,
        triggeredAt: new Date("2026-07-13T10:00:00.000Z"),
        sendAt: new Date("2026-07-13T10:15:00.000Z"),
        sentAt: null,
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
      },
    ]);

    const sent = await service.processPendingTriggers(async () => undefined);

    expect(sent).toBe(1);
    expect(markSentMock).toHaveBeenCalledWith("scheduled_1");
  });
});
