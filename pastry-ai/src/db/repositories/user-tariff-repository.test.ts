import { describe, expect, it, vi } from "vitest";
import { createUserTariffRepository } from "./user-tariff-repository";

describe("UserTariffRepository", () => {
  it("finds user tariff by userId", async () => {
    const mockDelegate = {
      findUnique: vi.fn().mockResolvedValue({
        id: "ut1", userId: "u1", tariffPlanId: "tp1",
        remainingTokens: 15, startedAt: new Date(), expiresAt: new Date(),
        tariffPlan: { name: "Промо" },
      }),
      upsert: vi.fn(),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.findByUserId("u1");
    expect(result?.tariffPlan.name).toBe("Промо");
    expect(result?.remainingTokens).toBe(15);
  });

  it("returns null when no tariff found", async () => {
    const mockDelegate = {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.findByUserId("u1");
    expect(result).toBeNull();
  });

  it("upserts a user tariff (full replace)", async () => {
    const mockDelegate = {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({
        id: "ut1", userId: "u1", tariffPlanId: "tp1",
        remainingTokens: 100, startedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000),
      }),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.upsert("u1", { tariffPlanId: "tp1", remainingTokens: 100, expiresAt: new Date(Date.now() + 30 * 86400000) });
    expect(result.remainingTokens).toBe(100);
    expect(mockDelegate.upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      update: expect.objectContaining({ tariffPlanId: "tp1", remainingTokens: 100 }),
      create: expect.objectContaining({ userId: "u1", tariffPlanId: "tp1", remainingTokens: 100 }),
    });
  });
});