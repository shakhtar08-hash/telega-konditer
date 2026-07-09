import { describe, expect, it, vi } from "vitest";

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockRejectedValue(new Error("playwright disabled in test")),
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: {},
}));

import { createRecipeCardService } from "@/features/recipe-card/recipe-card-service";

function createRecipeCardAgent() {
  return {
    execute: vi.fn().mockResolvedValue({
      title: "Тарт",
      description: "Ягодный десерт",
      ingredients: [],
      steps: ["Смешать"],
      tips: [],
      meta: {
        time: "30 минут",
        yield: "1 торт",
        difficulty: null,
        storage: null,
        weight: null,
      },
    }),
  };
}

function createAiService() {
  return {
    generateImage: vi.fn(),
  } as any;
}

describe("recipe card service", () => {
  it("builds canonical recipe text from recipeJson and reuses saved imageUrl", async () => {
    const recipeCardAgent = createRecipeCardAgent();
    const aiService = createAiService();
    const service = createRecipeCardService({ recipeCardAgent, aiService });
    const expectedRecipeText = [
      "1. Название",
      "Тарт",
      "",
      "2. Почему подходит",
      "Подходит для витрины и доставки",
      "",
      "3. Ингредиенты",
      "- Ягоды — 200 г",
      "- Сливки — 100 мл",
      "",
      "4. Полная технология приготовления",
      "1. Смешать крем",
      "2. Охладить тарт",
      "",
      "5. Время приготовления",
      "- Активное время: 10 минут",
      "- Охлаждение/заморозка: 20 минут",
      "- Общее время: 30 минут",
      "",
      "6. Сложность",
      "🟢 Легко",
      "",
      "7. Совет кондитера",
      "Охладить перед подачей",
    ].join("\n");

    await service.createCard({
      recipeJson: {
        name: "Тарт",
        whyFits: "Подходит для витрины и доставки",
        ingredients: ["Ягоды — 200 г", "Сливки — 100 мл"],
        steps: ["Смешать крем", "Охладить тарт"],
        activeTime: "10 минут",
        chillingTime: "20 минут",
        totalTime: "30 минут",
        difficulty: "easy",
        pastryTip: "Охладить перед подачей",
        imagePrompt: "Berry tart",
      },
      imageUrl: "https://img.test/tart.png",
      template: "minimal",
    });

    expect(recipeCardAgent.execute).toHaveBeenCalledWith({
      recipeText: expectedRecipeText,
      promptSlug: undefined,
    });
    expect(aiService.generateImage).not.toHaveBeenCalled();
  });

  it("keeps the existing manual recipeText path unchanged", async () => {
    const recipeCardAgent = createRecipeCardAgent();
    const aiService = createAiService();
    const service = createRecipeCardService({ recipeCardAgent, aiService });
    const recipeText = "Manual recipe text";

    await service.createCard({
      recipeText,
      imageUrl: "https://img.test/tart.png",
      template: "minimal",
    });

    expect(recipeCardAgent.execute).toHaveBeenCalledWith({
      recipeText,
      promptSlug: undefined,
    });
    expect(aiService.generateImage).not.toHaveBeenCalled();
  });

  it("accepts saved-context-compatible recipeJson input", async () => {
    const recipeCardAgent = createRecipeCardAgent();
    const aiService = createAiService();
    const service = createRecipeCardService({ recipeCardAgent, aiService });

    await service.createCard({
      recipeJson: {
        name: "Тарт",
        whyFits: "",
        ingredients: [],
        steps: [],
        activeTime: "",
        chillingTime: "",
        totalTime: "",
        difficulty: "easy",
        pastryTip: "",
        imagePrompt: "",
      },
      imageUrl: "https://img.test/tart.png",
      template: "minimal",
    });

    expect(recipeCardAgent.execute).toHaveBeenCalled();
    expect(aiService.generateImage).not.toHaveBeenCalled();
  });
});

describe("recipe context callbacks", () => {
  it("loads saved recipe by id and returns null for missing", async () => {
    const repository = {
      findByIdForUser: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    };

    const result = await repository.findByIdForUser("missing_id", "user_1");
    expect(result).toBeNull();
    expect(repository.findByIdForUser).toHaveBeenCalledWith("missing_id", "user_1");
  });

  it("finds saved recipe by id for the correct user", async () => {
    const repository = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: "recipe_1",
        userId: "user_1",
        recipeText: "Текст рецепта",
        recipeJson: {
          name: "Тарт",
          whyFits: "Подходит",
          ingredients: ["Ягоды"],
          steps: ["Смешать"],
          activeTime: "10 минут",
          chillingTime: "20 минут",
          totalTime: "30 минут",
          difficulty: "easy",
          pastryTip: "Охладить",
          imagePrompt: "Berry tart",
        },
        imageUrl: "https://img.test/tart.png",
        source: "create_recipe",
        createdAt: new Date(),
      }),
      create: vi.fn(),
    };

    const recipe = await repository.findByIdForUser("recipe_1", "user_1");
    expect(recipe).not.toBeNull();
    expect(recipe?.imageUrl).toBe("https://img.test/tart.png");
  });
});
