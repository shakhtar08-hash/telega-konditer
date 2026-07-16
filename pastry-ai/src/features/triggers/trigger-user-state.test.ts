import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/prisma", () => ({
  prisma: {},
}));

const { createTriggerUserStateLoader } = await import("./trigger-user-state");

describe("createTriggerUserStateLoader", () => {
  it("loads persisted user group memberships into trigger state", async () => {
    const loadTriggerUserState = createTriggerUserStateLoader({
      countGeneratedRecipes: vi.fn().mockResolvedValue(2),
      findUser: vi.fn().mockResolvedValue({
        plan: "FREE",
        promoClaimed: false,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      findUserGroups: vi.fn().mockResolvedValue([
        { userGroupId: "vip" },
        { userGroupId: "promo-testers" },
      ]),
      findUserTariff: vi.fn().mockResolvedValue(null),
      findLastActivityAt: vi.fn().mockResolvedValue(new Date("2026-07-12T00:00:00.000Z")),
    });

    await expect(loadTriggerUserState("user_1")).resolves.toEqual({
      plan: "FREE",
      promoClaimed: false,
      hasActiveTariff: false,
      generationCount: 2,
      groupIds: ["vip", "promo-testers"],
      remainingTokens: 0,
      tariffExpired: false,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      lastActivityAt: new Date("2026-07-12T00:00:00.000Z"),
    });
  });
});
