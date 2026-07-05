import { describe, expect, it, vi } from "vitest";
import { createTokenUsageRepository } from "./token-usage-repository";

describe("TokenUsageRepository", () => {
  it("creates a token usage record", async () => {
    const mockDelegate = {
      create: vi.fn().mockResolvedValue({
        id: "tu1", userId: "u1", feature: "recipes",
        promptSlug: "recipe-from-ingredients", imagesSent: 2, tokensSpent: 2,
      }),
    };
    const repo = createTokenUsageRepository(mockDelegate as never);
    const result = await repo.create({
      userId: "u1", feature: "recipes", promptSlug: "recipe-from-ingredients",
      imagesSent: 2, tokensSpent: 2,
    });
    expect(result.tokensSpent).toBe(2);
    expect(mockDelegate.create).toHaveBeenCalledWith({
      data: { userId: "u1", feature: "recipes", promptSlug: "recipe-from-ingredients", imagesSent: 2, tokensSpent: 2 },
    });
  });
});