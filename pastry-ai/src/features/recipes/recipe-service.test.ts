import { describe, expect, it } from "vitest";
import { createRecipeService } from "./recipe-service";

const recipeText = "\u041d\u0430\u0448\u0435\u043b 2 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0445 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u0430.";
const ingredientsText =
  "\u0415\u0441\u0442\u044c:\n- \u0441\u043b\u0438\u0432\u043a\u0438 33%\n- \u043c\u0430\u0441\u043a\u0430\u0440\u043f\u043e\u043d\u0435";

describe("RecipeService", () => {
  it("validates ingredients and delegates the full ingredient text to RecipeAgent", async () => {
    const calls: string[] = [];
    const service = createRecipeService({
      recipeAgent: {
        execute: async (input) => {
          calls.push(input.ingredientsText);
          return recipeText;
        },
      },
    });

    const result = await service.createFromIngredients({
      ingredientsText,
    });

    expect(calls).toEqual([ingredientsText]);
    expect(result).toBe(recipeText);
  });

  it("rejects empty ingredients", async () => {
    const service = createRecipeService({
      recipeAgent: {
        execute: async () => "",
      },
    });

    await expect(
      service.createFromIngredients({ ingredientsText: " " }),
    ).rejects.toThrow("Ingredients are required");
  });
});
