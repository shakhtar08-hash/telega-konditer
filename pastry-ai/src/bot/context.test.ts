import { describe, expect, it } from "vitest";
import {
  clearRecipeScenario,
  clearScenarioSession,
  setActivePrompt,
  setRecipeIngredients,
} from "./context";

describe("bot session helpers", () => {
  it("clears all scenario state", () => {
    const session = {
      lastFeature: "recipes" as const,
      lastPromptSlug: "recipe-from-ingredients",
      lastRecipeRequestText: "сливки, клубника",
    };

    clearScenarioSession(session);

    expect(session).toMatchObject({
      lastFeature: undefined,
      lastPromptSlug: undefined,
      lastRecipeRequestText: undefined,
    });
  });

  it("drops stale recipe context when a new prompt is selected", () => {
    const session = {
      lastFeature: "recipes" as const,
      lastPromptSlug: "recipe-from-ingredients",
      lastRecipeRequestText: "старый запрос",
    };

    setActivePrompt(session, "recipes", "best-recipe-search");

    expect(session).toMatchObject({
      lastFeature: "recipes",
      lastPromptSlug: "best-recipe-search",
      lastRecipeRequestText: undefined,
    });
  });

  it("stores recipe scenario ingredients and step", () => {
    const session = {};

    setRecipeIngredients(session, {
      baseIngredientsText: "сливки, клубника",
      currentIngredientsText: "сливки, клубника, яйца",
    });

    expect(session).toMatchObject({
      baseIngredientsText: "сливки, клубника",
      currentIngredientsText: "сливки, клубника, яйца",
      recipeScenarioStep: "ingredients_set",
      recipeLastIntent: "search",
    });
  });

  it("clears full recipe scenario state", () => {
    const session = {
      baseIngredientsText: "сливки",
      currentIngredientsText: "сливки, яйца",
      lastRecipeListText: "Нашел 3 варианта",
      lastShownRecipe: "2",
      recipeScenarioStep: "results_shown" as const,
      recipeLastIntent: "modify_ingredients" as const,
    };

    clearRecipeScenario(session);

    expect(session).toMatchObject({
      baseIngredientsText: undefined,
      currentIngredientsText: undefined,
      lastRecipeListText: undefined,
      lastShownRecipe: undefined,
      recipeScenarioStep: "idle",
      recipeLastIntent: undefined,
    });
  });
});
