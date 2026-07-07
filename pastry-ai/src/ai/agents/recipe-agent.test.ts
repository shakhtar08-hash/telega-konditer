import { describe, expect, it } from "vitest";
import type { AIService } from "../provider/ai-service";
import { createRecipeAgent } from "./recipe-agent";

const recipeTitle =
  "\u0420\u0435\u0446\u0435\u043f\u0442 \u043f\u043e \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u0430\u043c";
const recipeOutput = {
  recipes: [
    {
      name: "\u0422\u0438\u0440\u0430\u043c\u0438\u0441\u0443",
      whyFits: "\u041f\u043e\u0434\u0445\u043e\u0434\u0438\u0442 \u043f\u043e \u043d\u0430\u0431\u043e\u0440\u0443 \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u043e\u0432.",
      ingredients: ["\u041c\u0430\u0441\u043a\u0430\u0440\u043f\u043e\u043d\u0435 - 250 \u0433"],
      steps: ["\u0421\u043c\u0435\u0448\u0430\u0439\u0442\u0435 \u043e\u0441\u043d\u043e\u0432\u0443.", "\u041e\u0445\u043b\u0430\u0434\u0438\u0442\u0435.", "\u0421\u043e\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0435\u0441\u0435\u0440\u0442."],
      activeTime: "20 \u043c\u0438\u043d\u0443\u0442",
      chillingTime: "4 \u0447\u0430\u0441\u0430",
      totalTime: "4 \u0447\u0430\u0441\u0430 20 \u043c\u0438\u043d\u0443\u0442",
      difficulty: "easy",
      pastryTip: "\u041d\u0435 \u043f\u0435\u0440\u0435\u0432\u0437\u0431\u0438\u0432\u0430\u0439\u0442\u0435 \u043a\u0440\u0435\u043c.",
      imagePrompt: "Luxury tiramisu in an elegant glass cup, ultra realistic pastry photography.",
    },
  ],
};

const mockAiService = {
  generateText: async () => "",
  generateImage: async () => ({ url: "" }),
  generateObject: async () => recipeOutput,
} as AIService;

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
        ...mockAiService,
        generateObject: async (input: Record<string, unknown>) => {
          calls.push(input.prompt as string);
          calls.push(input.provider as string);
          calls.push(input.system as string);
          return recipeOutput;
        },
      } as AIService,
    });

    const result = await agent.execute({
      ingredientsText: "eggs, butter, flour",
    });

    expect(calls[0]).toBe("Ingredients: eggs, butter, flour");
    expect(calls[1]).toBe("openrouter");
    expect(calls[2]).toContain("imagePrompt must be one paragraph");
    expect(result).toEqual(recipeOutput);
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
      aiService: mockAiService,
    });

    await agent.execute({
      ingredientsText: "Нужен лучший рецепт медовика",
      promptSlug: "best-recipe-search",
    });

    expect(loadedSlugs).toEqual(["best-recipe-search"]);
  });
});
