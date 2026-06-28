import { describe, expect, it } from "vitest";
import { createRecipeService } from "./recipe-service";

describe("RecipeService", () => {
  it("validates ingredients and delegates to RecipeAgent", async () => {
    const service = createRecipeService({
      recipeAgent: {
        execute: async (input) => ({
          title: input.ingredients.join(" "),
          description: "Generated recipe",
          ingredients: input.ingredients,
          steps: ["Mix", "Bake"],
        }),
      },
    });

    const recipe = await service.createFromIngredients({
      ingredientsText: "eggs, butter, flour",
    });

    expect(recipe.ingredients).toEqual(["eggs", "butter", "flour"]);
  });

  it("rejects empty ingredients", async () => {
    const service = createRecipeService({
      recipeAgent: {
        execute: async () => ({
          title: "",
          description: "",
          ingredients: [],
          steps: [],
        }),
      },
    });

    await expect(
      service.createFromIngredients({ ingredientsText: " " }),
    ).rejects.toThrow("Ingredients are required");
  });
});
