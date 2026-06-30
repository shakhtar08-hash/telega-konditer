import { describe, expect, it } from "vitest";
import {
  createPromptRepository,
  type PromptRecord,
} from "./prompt-repository";

describe("PromptRepository", () => {
  it("finds the active prompt by feature and slug", async () => {
    const prompts: PromptRecord[] = [
      {
        id: "prompt_1",
        slug: "recipe-from-ingredients",
        feature: "recipes",
        provider: "openrouter",
        systemPrompt: "You are a pastry chef.",
        userTemplate: "Ingredients: {{ingredients}}",
        model: "gpt-4o-mini",
        temperature: 0.3,
        active: true,
        version: 1,
      },
    ];

    const repository = createPromptRepository({
      findFirst: async () => prompts[0] ?? null,
    });

    await expect(
      repository.findActiveBySlug("recipes", "recipe-from-ingredients"),
    ).resolves.toEqual(prompts[0]);
  });
});
