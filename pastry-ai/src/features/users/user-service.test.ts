import { describe, expect, it } from "vitest";
import { createUserService } from "./user-service";

describe("UserService", () => {
  it("registers a Telegram user and assigns promo tariff when missing", async () => {
    const promoPlan = {
      id: "tariff_promo",
      slug: "promo",
      name: "Промо",
      tokenAmount: 15,
      durationDays: 3,
      active: true,
      sortOrder: 0,
    };
    const service = createUserService({
      userRepository: {
        upsertTelegramUser: async (input) => ({
          id: "user_1",
          telegramId: input.telegramId,
          username: input.username ?? null,
          name: input.name ?? null,
          plan: "FREE",
          credits: 10,
        }),
      },
      tariffPlanRepository: {
        findBySlug: async (slug) => (slug === "promo" ? promoPlan : null),
      },
      userTariffRepository: {
        findByUserId: async () => null,
        upsert: async (userId, data) => ({
          id: "ut_1",
          userId,
          tariffPlanId: data.tariffPlanId,
          remainingTokens: data.remainingTokens,
          startedAt: new Date("2026-07-05T00:00:00.000Z"),
          expiresAt: data.expiresAt,
          tariffPlan: { name: "Промо", slug: "promo" },
        }),
      },
    });

    const user = await service.registerTelegramUser({
      telegramId: "42",
      username: "chef",
      name: "Chef",
    });

    expect(user.telegramId).toBe("42");
  });

  it("does not replace an existing tariff on repeated /start", async () => {
    let upsertCalls = 0;

    const service = createUserService({
      userRepository: {
        upsertTelegramUser: async (input) => ({
          id: "user_1",
          telegramId: input.telegramId,
          username: input.username ?? null,
          name: input.name ?? null,
          plan: "FREE",
          credits: 10,
        }),
      },
      tariffPlanRepository: {
        findBySlug: async () => null,
      },
      userTariffRepository: {
        findByUserId: async () => ({
          id: "ut_1",
          userId: "user_1",
          tariffPlanId: "tariff_promo",
          remainingTokens: 7,
          startedAt: new Date("2026-07-05T00:00:00.000Z"),
          expiresAt: new Date("2026-07-08T00:00:00.000Z"),
          tariffPlan: { name: "Промо", slug: "promo" },
        }),
        upsert: async () => {
          upsertCalls += 1;
          throw new Error("should not be called");
        },
      },
    });

    await service.registerTelegramUser({
      telegramId: "42",
      username: "chef",
      name: "Chef",
    });

    expect(upsertCalls).toBe(0);
  });
});
