import { describe, expect, it } from "vitest";
import { createUserService } from "./user-service";

describe("UserService", () => {
  it("registers a Telegram user without auto-assigning promo tariff", async () => {
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
        findByUserId: async () => null,
        upsert: async () => {
          upsertCalls += 1;
          throw new Error("should not be called on register");
        },
      },
    });

    const user = await service.registerTelegramUser({
      telegramId: "42",
      username: "chef",
      name: "Chef",
    });

    expect(user.telegramId).toBe("42");
    expect(upsertCalls).toBe(0);
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

  it("assigns promo tariff on explicit call and returns existing tariff if already assigned", async () => {
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
        findBySlug: async (slug) =>
          slug === "promo"
            ? {
                id: "tariff_promo",
                slug: "promo",
                name: "Промо",
                tokenAmount: 15,
                durationDays: 3,
                active: true,
                sortOrder: 0,
              }
            : null,
      },
      userTariffRepository: {
        findByUserId: async () => null,
        upsert: async (userId, data) => {
          upsertCalls += 1;
          return {
            id: "ut_1",
            userId,
            tariffPlanId: data.tariffPlanId,
            remainingTokens: data.remainingTokens,
            startedAt: new Date("2026-07-05T00:00:00.000Z"),
            expiresAt: data.expiresAt,
            tariffPlan: { name: "Промо", slug: "promo" },
          };
        },
      },
    });

    const tariff = await service.assignPromoTariff("user_1");

    expect(upsertCalls).toBe(1);
    expect(tariff.remainingTokens).toBe(15);
  });

  it("skips promo assignment if already has a tariff", async () => {
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
        findBySlug: async (slug) =>
          slug === "promo"
            ? {
                id: "tariff_promo",
                slug: "promo",
                name: "Промо",
                tokenAmount: 15,
                durationDays: 3,
                active: true,
                sortOrder: 0,
              }
            : null,
      },
      userTariffRepository: {
        findByUserId: async () => ({
          id: "ut_1",
          userId: "user_1",
          tariffPlanId: "tariff_promo",
          remainingTokens: 15,
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

    const tariff = await service.assignPromoTariff("user_1");

    expect(upsertCalls).toBe(0);
    expect(tariff.remainingTokens).toBe(15);
  });
});