import { describe, expect, it } from "vitest";
import { createRecipeService } from "./recipe-service";

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
      difficulty: "easy" as const,
      pastryTip: "Не перевзбивайте крем.",
      imagePrompt:
        "Luxury tiramisu in an elegant glass cup, ultra realistic pastry photography.",
    },
    {
      name: "Панна-котта",
      whyFits: "Нежный сливочный десерт из ваших продуктов.",
      ingredients: ["Сливки 33% - 400 г"],
      steps: [
        "Нагрейте сливки.",
        "Добавьте желатин.",
        "Охладите до стабилизации.",
      ],
      activeTime: "15 минут",
      chillingTime: "5 часов",
      totalTime: "5 часов 15 минут",
      difficulty: "easy" as const,
      pastryTip: "Желатин нельзя кипятить.",
      imagePrompt:
        "Premium panna cotta with strawberry topping, elegant plating, food magazine quality.",
    },
  ],
};
const ingredientsText = "Есть:\n- сливки 33%\n- маскарпоне";

describe("RecipeService", () => {
  it("validates ingredients and delegates to RecipeAgent", async () => {
    const calls: string[] = [];
    const service = createRecipeService({
      recipeAgent: {
        execute: async (input) => {
          calls.push(input.ingredientsText);
          return recipeOutput;
        },
      },
    });
    const result = await service.createFromIngredients({ ingredientsText });
    expect(calls).toEqual([ingredientsText]);
    expect(result).toEqual(recipeOutput);
  });

  it("rejects empty ingredients", async () => {
    const service = createRecipeService({
      recipeAgent: { execute: async () => recipeOutput },
    });
    await expect(
      service.createFromIngredients({ ingredientsText: " " }),
    ).rejects.toThrow("Ingredients are required");
  });
});
