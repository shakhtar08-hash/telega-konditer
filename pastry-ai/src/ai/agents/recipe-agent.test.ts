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

const singleRecipeOutput = {
  recipes: [
    {
      name: "\u0427\u0438\u0437\u043a\u0435\u0439\u043a",
      whyFits: "\u0414\u0430\u0436\u0435 \u0441 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u044b\u043c \u043d\u0430\u0431\u043e\u0440\u043e\u043c \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u043e\u0432 \u044d\u0442\u043e \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442.",
      ingredients: ["\u0421\u043b\u0438\u0432\u043e\u0447\u043d\u044b\u0439 \u0441\u044b\u0440 - 300 \u0433"],
      steps: [
        "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u044c\u0442\u0435 \u043e\u0441\u043d\u043e\u0432\u0443.",
        "\u0421\u043c\u0435\u0448\u0430\u0439\u0442\u0435 \u043d\u0430\u0447\u0438\u043d\u043a\u0443.",
        "\u0414\u043e\u0432\u0435\u0434\u0438\u0442\u0435 \u0434\u043e \u0433\u043e\u0442\u043e\u0432\u043d\u043e\u0441\u0442\u0438.",
      ],
      activeTime: "25 \u043c\u0438\u043d\u0443\u0442",
      chillingTime: "3 \u0447\u0430\u0441\u0430",
      totalTime: "3 \u0447\u0430\u0441\u0430 25 \u043c\u0438\u043d\u0443\u0442",
      difficulty: "medium",
      pastryTip: "\u041d\u0435 \u043f\u0435\u0440\u0435\u0433\u0440\u0435\u0432\u0430\u0439\u0442\u0435 \u043d\u0430\u0447\u0438\u043d\u043a\u0443.",
      imagePrompt: "Premium cheesecake on a marble stand, realistic pastry photography.",
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

  it("accepts one recipe as a valid fallback result", async () => {
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
          const schema = input.schema as {
            parse: (value: unknown) => typeof singleRecipeOutput;
          };
          return schema.parse(singleRecipeOutput);
        },
      } as AIService,
    });

    const result = await agent.execute({
      ingredientsText: "cream cheese",
    });

expect(result).toEqual(singleRecipeOutput);
  });

  it("accepts four recipes as valid max output", async () => {
    const fourRecipeOutput = {
      recipes: Array.from({ length: 4 }, (_, i) => ({
        name: `Recipe ${i + 1}`,
        whyFits: `Reason ${i + 1}`,
        ingredients: [`Ingredient ${i + 1}`],
        steps: ["Step 1", "Step 2", "Step 3"],
        activeTime: "10 minutes",
        chillingTime: "30 minutes",
        totalTime: "40 minutes",
        difficulty: "easy" as const,
        pastryTip: "Tip",
        imagePrompt: "Dessert photo",
      })),
    };

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
          const schema = input.schema as {
            parse: (value: unknown) => typeof fourRecipeOutput;
          };
          return schema.parse(fourRecipeOutput);
        },
      } as AIService,
    });

    const result = await agent.execute({
      ingredientsText: "flour, sugar, eggs, butter, milk",
    });

    expect(result.recipes).toHaveLength(4);
  });

  it("tells the model to return one to four recipes and not treat one as error", async () => {
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

expect(systemMessages[0]).toContain("Return 1 to 4 recipes");
    expect(systemMessages[0]).toContain("1 recipe is a normal valid response");
    expect(systemMessages[0]).toContain("Do not treat 1 recipe as an error or fallback");
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
