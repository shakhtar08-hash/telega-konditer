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

vi.mock("@/features/dynamic-user-groups/service", () => ({
  matchesSavedDynamicUserGroup: vi.fn().mockResolvedValue(true),
}));

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
  messageText: "Hello!",
  imageUrl: null,
  buttons: null,
  conditions: [
    { field: "promoClaimed", operator: "is", value: false },
    { field: "hasActiveTariff", operator: "is", value: false },
  ],
};

describe("evaluateConditions", () => {
  it("returns true only when every condition matches the user state", async () => {
    await expect(evaluateConditions(baseRule.conditions, baseState)).resolves.toBe(true);

    await expect(
      evaluateConditions(
        [
          ...baseRule.conditions,
          { field: "generationCount", operator: "equals", value: 1 },
        ],
        baseState,
      ),
    ).resolves.toBe(false);
  });

  it("supports numeric and group membership conditions", async () => {
    await expect(
      evaluateConditions(
        [
          { field: "generationCount", operator: "gte", value: 3 },
          { field: "userGroupId", operator: "isMember", value: "vip" },
        ],
        {
          ...baseState,
          generationCount: 4,
          groupIds: ["vip", "promo-users"],
        },
      ),
    ).resolves.toBe(true);
  });

  it("supports dynamic group conditions", async () => {
    await expect(
      evaluateConditions(
        [{ field: "dynamicUserGroupId", operator: "matches", value: "group_new" }],
        baseState,
      ),
    ).resolves.toBe(true);
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

  it("schedules a trigger when the user belongs to the selected manual group", async () => {
    findActiveRulesByEventMock.mockResolvedValue([
      {
        ...baseRule,
        conditions: [{ field: "userGroupId", operator: "isMember", value: "vip" }],
      },
    ]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("user.started", "12345", {
      ...baseState,
      groupIds: ["vip"],
    });

    expect(createScheduledMock).toHaveBeenCalledTimes(1);
    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerRuleId: "rule_1",
        triggerEventKey: "user.started",
        chatId: "12345",
      }),
    );
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

  it("sends queued trigger payloads using the stored snapshot", async () => {
    findPendingScheduledMock.mockResolvedValue([
      {
        id: "pending_1",
        triggerRuleId: "rule_1",
        triggerEventKey: "user.started",
        chatId: "12345",
        text: "Snapshot text",
        imageUrl: "/uploads/admin/triggers/hero.webp",
        buttons: [
          { text: "Try free", type: "url", value: "https://example.com" },
        ],
        triggeredAt: new Date("2026-07-13T10:00:00.000Z"),
        sendAt: new Date("2026-07-13T10:15:00.000Z"),
        sentAt: null,
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
      },
    ]);

    const sendMessageMock = vi.fn(async () => undefined);
    const sent = await service.processPendingTriggers(sendMessageMock);

    expect(sent).toBe(1);
    expect(sendMessageMock).toHaveBeenCalledWith("12345", "Snapshot text", {
      imageUrl: "/uploads/admin/triggers/hero.webp",
      buttons: [
        { text: "Try free", type: "url", value: "https://example.com" },
      ],
    });
    expect(markSentMock).toHaveBeenCalledWith("pending_1");
  });

  it("marks a pending row as sent when message delivery fails", async () => {
    const sendError = new Error("send failed");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    findPendingScheduledMock.mockResolvedValue([
      {
        id: "scheduled_2",
        triggerRuleId: "rule_2",
        triggerEventKey: "user.started",
        chatId: "99999",
        text: "Fallback",
        imageUrl: null,
        buttons: null,
        triggeredAt: new Date("2026-07-13T10:00:00.000Z"),
        sendAt: new Date("2026-07-13T10:15:00.000Z"),
        sentAt: null,
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
      },
    ]);

    const sent = await service.processPendingTriggers(async () => {
      throw sendError;
    });

    expect(sent).toBe(0);
    expect(markSentMock).toHaveBeenCalledWith("scheduled_2");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to send trigger message",
      expect.objectContaining({
        chatId: "99999",
        error: sendError,
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});
