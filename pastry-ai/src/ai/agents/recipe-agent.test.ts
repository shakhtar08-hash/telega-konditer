import { describe, expect, it } from "vitest";
import { createRecipeAgent } from "./recipe-agent";

const recipeTitle =
  "\u0420\u0435\u0446\u0435\u043f\u0442 \u043f\u043e \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u0430\u043c";
const recipeText =
  "\u041d\u0430\u0448\u0435\u043b 3 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0445 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u0430.";

describe("RecipeAgent", () => {
  it("uses prompt loader and AIService to generate recipe text", async () => {
    const calls: string[] = [];
    const agent = createRecipeAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_1",
          slug: "recipe-from-ingredients",
          feature: "recipes",
          title: recipeTitle,
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
        generateText: async (input) => {
          calls.push(input.prompt);
          calls.push(input.provider);
          return recipeText;
        },
        generateImage: async () => ({ url: "" }),
        generateObject: async () => {
          throw new Error("generateObject should not be used for recipe text");
        },
      },
    });

    const result = await agent.execute({
      ingredientsText: "eggs, butter, flour",
    });

    expect(calls[0]).toBe("Ingredients: eggs, butter, flour");
    expect(calls[1]).toBe("openrouter");
    expect(result).toBe(recipeText);
  });

  it("loads the selected recipe prompt slug", async () => {
    const loadedSlugs: string[] = [];
    const agent = createRecipeAgent({
      promptLoader: {
        load: async (_feature, slug) => {
          loadedSlugs.push(slug);

          return {
            id: "prompt_best_recipe",
            slug,
            feature: "recipes",
            title: "Поиск лучшего рецепта",
            provider: "openrouter",
            systemPrompt: "You are a pastry chef.",
            userTemplate: "Request: {{ingredients}}",
            model: "google/gemini-2.5-pro",
            temperature: 0.3,
            active: true,
            version: 1,
          };
        },
      },
      aiService: {
        generateText: async () => recipeText,
        generateImage: async () => ({ url: "" }),
        generateObject: async () => {
          throw new Error("generateObject should not be used for recipe text");
        },
      },
    });

    await agent.execute({
      ingredientsText: "Нужен лучший рецепт медовика",
      promptSlug: "best-recipe-search",
    });

    expect(loadedSlugs).toEqual(["best-recipe-search"]);
  });
});
