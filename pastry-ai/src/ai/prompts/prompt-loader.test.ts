import { describe, expect, it } from "vitest";
import { createPromptLoader } from "./prompt-loader";

describe("createPromptLoader", () => {
  it("loads an active prompt", async () => {
    const loader = createPromptLoader({
      findActiveBySlug: async () => ({
        id: "prompt_1",
        slug: "recipe-from-ingredients",
        feature: "recipes",
        systemPrompt: "System",
        userTemplate: "Ingredients: {{ingredients}}",
        model: "gpt-4o-mini",
        temperature: 0.3,
        active: true,
        version: 1,
      }),
    });

    await expect(
      loader.load("recipes", "recipe-from-ingredients"),
    ).resolves.toMatchObject({
      slug: "recipe-from-ingredients",
    });
  });

  it("throws when a prompt is missing", async () => {
    const loader = createPromptLoader({
      findActiveBySlug: async () => null,
    });

    await expect(loader.load("recipes", "missing")).rejects.toThrow(
      "Prompt not found: recipes/missing",
    );
  });
});
