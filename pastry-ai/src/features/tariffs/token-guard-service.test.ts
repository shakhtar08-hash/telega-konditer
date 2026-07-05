import { describe, expect, it, vi } from "vitest";
import { createTokenGuardService } from "./token-guard-service";
import { UserFacingError } from "@/lib/user-facing-error";

describe("TokenGuardService", () => {
  const mockUserTariffRepo = {
    findByUserId: vi.fn(),
    upsert: vi.fn(),
    updateRemainingTokens: vi.fn(),
  };
  const mockTokenUsageRepo = {
    create: vi.fn(),
  };

  const expiredDate = new Date(Date.now() - 86400000);
  const futureDate = new Date(Date.now() + 86400000);

  it("allows sufficient tokens for batch", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 10, expiresAt: futureDate,
      tariffPlan: { name: "Мастер" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).resolves.toBeUndefined();
  });

  it("throws when tariff expired", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 10, expiresAt: expiredDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(UserFacingError);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(/истёк/);
  });

  it("throws when not enough tokens for batch", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: futureDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(UserFacingError);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(/не хватает/);
  });

  it("returns available photo slots (min of requested and remaining)", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: futureDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const slots = await guard.getAvailablePhotoSlots("u1", 4);
    expect(slots).toBe(3);
  });

  it("returns 0 when tariff expired", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: expiredDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const slots = await guard.getAvailablePhotoSlots("u1", 4);
    expect(slots).toBe(0);
  });

  it("charges tokens and logs usage", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 5, expiresAt: futureDate,
      tariffPlan: { name: "Промо" },
    });
    mockUserTariffRepo.updateRemainingTokens.mockResolvedValue({});
    mockTokenUsageRepo.create.mockResolvedValue({});
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await guard.chargeTokens("u1", "recipes", "recipe-from-ingredients", 2);
    expect(mockUserTariffRepo.updateRemainingTokens).toHaveBeenCalledWith("u1", 3);
    expect(mockTokenUsageRepo.create).toHaveBeenCalledWith({
      userId: "u1", feature: "recipes",
      promptSlug: "recipe-from-ingredients", imagesSent: 2, tokensSpent: 2,
    });
  });

  it("returns null when user has no tariff", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue(null);
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const state = await guard.getUserTariffState("u1");
    expect(state).toBeNull();
  });
});
