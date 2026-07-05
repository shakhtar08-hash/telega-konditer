import { describe, expect, it } from "vitest";
import { createRecipeService } from "./recipe-service";

const recipeOutput = {
  text: "Нашёл 2 подходящих варианта.",
  dishes: [
    { name: "Тирамису", description: "Классический итальянский десерт" },
    { name: "Панна-котта", description: "Нежный сливочный десерт" },
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