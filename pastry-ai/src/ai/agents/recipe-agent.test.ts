import { describe, expect, it } from "vitest";
import type { AIService } from "../provider/ai-service";
import { createRecipeAgent } from "./recipe-agent";

const recipeTitle = "Рецепт по ингредиентам";
const recipeOutput = {
  recipes: [
    {
      name: "Тирамису",
      whyFits: "Подходит по набору ингредиентов.",
      ingredients: ["Маскарпоне - 250 г"],
      steps: ["Смешайте основу.", "Охладите.", "Соберите десерт."],
      activeTime: "20 минут",
      chillingTime: "4 часа",
      totalTime: "4 часа 20 минут",
      difficulty: "easy",
      pastryTip: "Не перевзбивайте крем.",
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

  it("tells the model to return exactly 1 recipe", async () => {
    const systemMessages: string[] = [];
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
          systemMessages.push(input.system as string);
          return recipeOutput;
        },
      } as AIService,
    });

    await agent.execute({
      ingredientsText: "eggs, butter, flour",
    });

    expect(systemMessages[0]).toContain("Return exactly 1 recipe");
    expect(systemMessages[0]).toContain("Do NOT return multiple recipes");
  });

  it("passes excludeRecipes in the system prompt when provided", async () => {
    const systemMessages: string[] = [];
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
          systemMessages.push(input.system as string);
          return recipeOutput;
        },
      } as AIService,
    });

    await agent.execute({
      ingredientsText: "eggs, butter",
      excludeRecipes: ["Тирамису", "Чизкейк"],
    });

    expect(systemMessages[0]).toContain("Do NOT return any of these already-given recipes");
    expect(systemMessages[0]).toContain("Тирамису");
    expect(systemMessages[0]).toContain("Чизкейк");
  });

  it("skips exclusion instructions when excludeRecipes is empty", async () => {
    const systemMessages: string[] = [];
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
          systemMessages.push(input.system as string);
          return recipeOutput;
        },
      } as AIService,
    });

    await agent.execute({
      ingredientsText: "flour, sugar",
      excludeRecipes: [],
    });

    expect(systemMessages[0]).not.toContain("already-given recipes");
  });

  it("includes input interpretation rules for recipe-from-ingredients vs best-recipe-search", async () => {
    const systemMessages: string[] = [];
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
          systemMessages.push(input.system as string);
          return recipeOutput;
        },
      } as AIService,
    });

    await agent.execute({
      ingredientsText: "блины со сгущенкой",
      promptSlug: "best-recipe-search",
    });

    expect(systemMessages[0]).toContain("INPUT INTERPRETATION RULES");
    expect(systemMessages[0]).toContain("recipe-from-ingredients");
    expect(systemMessages[0]).toContain("best-recipe-search");
    expect(systemMessages[0]).toContain("блины со сгущенкой");
  });
});