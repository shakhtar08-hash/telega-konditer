import { describe, expect, it, vi } from "vitest";
import { hasActiveTariffAccess } from "./access";

const mockFindUnique = vi.fn();

vi.mock("@/db/prisma", () => ({
  prisma: {
    userTariff: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { userHasPromptAccess } from "./access";

describe("bot access", () => {
  it("allows prompt access only for non-expired tariffs", () => {
    expect(
      hasActiveTariffAccess(
        { expiresAt: new Date("2026-07-01T00:00:00.000Z") },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects missing or expired tariffs", () => {
    expect(hasActiveTariffAccess(null)).toBe(false);
    expect(
      hasActiveTariffAccess(
        { expiresAt: new Date("2026-06-29T00:00:00.000Z") },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("grants prompt access for user with active tariff even with zero tokens", async () => {
    mockFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86400000),
      remainingTokens: 0,
      tariffPlan: { tokenAmount: 15 },
    });

    const result = await userHasPromptAccess("user_1");
    expect(result).toBe(true);
  });

  it("denies prompt access for user with zero-tokenAmount plan (Без подписки)", async () => {
    mockFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86400000),
      remainingTokens: 0,
      tariffPlan: { tokenAmount: 0 },
    });

    const result = await userHasPromptAccess("user_1");
    expect(result).toBe(false);
  });

  it("denies prompt access for user with expired tariff even with tokens", async () => {
    mockFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 86400000),
      remainingTokens: 5,
      tariffPlan: { tokenAmount: 100 },
    });

    const result = await userHasPromptAccess("user_1");
    expect(result).toBe(false);
  });

  it("denies prompt access when no tariff exists", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await userHasPromptAccess("user_1");
    expect(result).toBe(false);
  });
});
