import { describe, expect, it } from "vitest";
import { createRecipeAgent } from "./recipe-agent";

describe("RecipeAgent", () => {
  it("uses prompt loader and AIService to generate a structured recipe", async () => {
    const calls: string[] = [];
    const agent = createRecipeAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_1",
          slug: "recipe-from-ingredients",
          feature: "recipes",
          title: "Рецепт по ингредиентам",
          provider: "openrouter",
          systemPrompt: "You are a pastry chef.",
          userTemplate: "Ingredients: {{ingredients}}",
          model: "gpt-4o-mini",
          temperature: 0.3,
          active: true,
          version: 1,
        }),
      },
      aiService: {
        generateText: async () => "",
        generateImage: async () => ({ url: "" }),
        generateObject: async (input) => {
          calls.push(input.prompt);
          calls.push(input.provider);
          return input.schema.parse({
            title: "Butter cookies",
            description: "Simple tender cookies.",
            ingredients: ["butter", "flour", "eggs"],
            steps: ["Mix ingredients", "Bake"],
          });
        },
      },
    });

    const result = await agent.execute({
      ingredients: ["eggs", "butter", "flour"],
    });

    expect(calls[0]).toBe("Ingredients: eggs, butter, flour");
    expect(calls[1]).toBe("openrouter");
    expect(result.title).toBe("Butter cookies");
  });
});
