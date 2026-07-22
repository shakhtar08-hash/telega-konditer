import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadDynamicUserGroupsOrEmptyMock,
  loadTriggerUserStateMock,
  loadUserGroupsOrEmptyMock,
  prismaMock,
  saveAdminImageMock,
} = vi.hoisted(() => ({
  loadDynamicUserGroupsOrEmptyMock: vi.fn(),
  loadTriggerUserStateMock: vi.fn(),
  loadUserGroupsOrEmptyMock: vi.fn(),
  prismaMock: {
    dynamicUserGroup: {
      findMany: vi.fn(),
    },
    scheduledMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    scenario: {
      findMany: vi.fn(),
    },
    triggerRule: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    userGroup: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  saveAdminImageMock: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/admin/_lib/save-admin-image", () => ({
  saveAdminImage: saveAdminImageMock,
}));

vi.mock("@/app/admin/_lib/user-groups", () => ({
  loadUserGroupsOrEmpty: loadUserGroupsOrEmptyMock,
}));

vi.mock("@/app/admin/_lib/dynamic-user-groups", () => ({
  loadDynamicUserGroupsOrEmpty: loadDynamicUserGroupsOrEmptyMock,
}));

vi.mock("@/features/triggers/trigger-user-state", () => ({
  loadTriggerUserState: loadTriggerUserStateMock,
}));

const {
  loadAdminTriggerEditorData,
  performCreateTriggerRule,
  performRunTriggerNow,
  performUpdateTriggerRule,
} = await import("./service");

describe("admin trigger service scenario delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveAdminImageMock.mockResolvedValue(null);
    loadUserGroupsOrEmptyMock.mockImplementation(async (loader) => ({
      groups: await loader(),
      unavailable: false,
    }));
    loadDynamicUserGroupsOrEmptyMock.mockImplementation(async (loader) => ({
      groups: await loader(),
      unavailable: false,
    }));
    prismaMock.dynamicUserGroup.findMany.mockResolvedValue([]);
    prismaMock.scheduledMessage.create.mockResolvedValue({});
    prismaMock.scheduledMessage.findFirst.mockResolvedValue(null);
    prismaMock.scenario.findMany.mockResolvedValue([]);
    prismaMock.triggerRule.create.mockResolvedValue({});
    prismaMock.triggerRule.findUnique.mockResolvedValue(null);
    prismaMock.triggerRule.update.mockResolvedValue({});
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.userGroup.findMany.mockResolvedValue([]);
    loadTriggerUserStateMock.mockResolvedValue({
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
  });

  it("creates SCENARIO delivery triggers without requiring legacy message text", async () => {
    const formData = new FormData();
    formData.set("name", "Promo follow-up");
    formData.set("eventKey", "promo.granted");
    formData.set("delayUnit", "now");
    formData.set("deliveryType", "SCENARIO");
    formData.set("scenarioId", "scenario_1");

    await performCreateTriggerRule(formData);

    expect(prismaMock.triggerRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buttons: [],
        deliveryType: "SCENARIO",
        imageUrl: null,
        messageText: "",
        scenarioId: "scenario_1",
      }),
    });
    expect(saveAdminImageMock).not.toHaveBeenCalled();
  });

  it("updates SCENARIO delivery triggers and clears legacy payload fields", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");
    formData.set("name", "Promo follow-up");
    formData.set("eventKey", "promo.granted");
    formData.set("delayUnit", "now");
    formData.set("status", "active");
    formData.set("deliveryType", "SCENARIO");
    formData.set("scenarioId", "scenario_1");

    await performUpdateTriggerRule(formData);

    expect(prismaMock.triggerRule.update).toHaveBeenCalledWith({
      where: { id: "rule_1" },
      data: expect.objectContaining({
        buttons: [],
        deliveryType: "SCENARIO",
        imageUrl: null,
        messageText: "",
        scenarioId: "scenario_1",
      }),
    });
    expect(saveAdminImageMock).not.toHaveBeenCalled();
  });

  it("loads trigger editor scenario options and existing delivery fields", async () => {
    prismaMock.triggerRule.findUnique.mockResolvedValue({
      buttons: [],
      conditions: [],
      delayUnit: "now",
      delayValue: 0,
      deliveryType: "SCENARIO",
      eventKey: "promo.granted",
      id: "rule_1",
      imageUrl: null,
      messageText: "",
      name: "Promo follow-up",
      scenarioId: "scenario_1",
      status: "active",
    });
    prismaMock.scenario.findMany.mockResolvedValue([
      { id: "scenario_1", name: "Promo flow", status: "active" },
    ]);

    await expect(loadAdminTriggerEditorData("rule_1")).resolves.toMatchObject({
      rule: {
        deliveryType: "SCENARIO",
        scenarioId: "scenario_1",
      },
      scenarios: [{ id: "scenario_1", name: "Promo flow", status: "active" }],
    });
  });

  it("runs a saved now-trigger for the current matching audience", async () => {
    const formData = new FormData();
    formData.set("id", "rule_now");

    prismaMock.triggerRule.findUnique.mockResolvedValue({
      buttons: [{ text: "Pay", type: "url", value: "https://pay.example.com" }],
      conditions: [{ field: "promoClaimed", operator: "is", value: false }],
      delayUnit: "now",
      delayValue: 0,
      deliveryType: "MESSAGE",
      eventKey: "promo.granted",
      id: "rule_now",
      imageUrl: "/uploads/admin/triggers/promo.png",
      messageText: "Promo for you",
      name: "Promo now",
      scenario: null,
      scenarioId: null,
      status: "active",
    });
    prismaMock.user.findMany = vi.fn().mockResolvedValue([
      { id: "user_1", telegramId: "1001" },
      { id: "user_2", telegramId: "1002" },
    ]);
    loadTriggerUserStateMock
      .mockResolvedValueOnce({
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        generationCount: 0,
        groupIds: [],
        hasActiveTariff: false,
        lastActivityAt: null,
        plan: "FREE",
        promoClaimed: false,
        remainingTokens: 0,
        tariffExpired: false,
      })
      .mockResolvedValueOnce({
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        generationCount: 0,
        groupIds: [],
        hasActiveTariff: false,
        lastActivityAt: null,
        plan: "FREE",
        promoClaimed: true,
        remainingTokens: 0,
        tariffExpired: false,
      });

    await expect(performRunTriggerNow(formData)).resolves.toEqual({
      message: "Разослано по текущей аудитории: 1",
      ok: true,
    });

    expect(prismaMock.scheduledMessage.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.scheduledMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buttons: [{ text: "Pay", type: "url", value: "https://pay.example.com" }],
        chatId: "1001",
        imageUrl: "/uploads/admin/triggers/promo.png",
        text: "Promo for you",
        triggerEventKey: "promo.granted",
        triggerRuleId: "rule_now",
      }),
    });
  });

  it("returns a validation error when a manual run is requested for a delayed trigger", async () => {
    const formData = new FormData();
    formData.set("id", "rule_later");

    prismaMock.triggerRule.findUnique.mockResolvedValue({
      buttons: [],
      conditions: [],
      delayUnit: "minutes",
      delayValue: 15,
      deliveryType: "MESSAGE",
      eventKey: "promo.granted",
      id: "rule_later",
      imageUrl: null,
      messageText: "Later",
      name: "Later",
      scenario: null,
      scenarioId: null,
      status: "active",
    });

    await expect(performRunTriggerNow(formData)).resolves.toEqual({
      message: "Этот запуск доступен только для режима «Разослать сейчас».",
      ok: false,
    });

    expect(prismaMock.scheduledMessage.create).not.toHaveBeenCalled();
  });
});
