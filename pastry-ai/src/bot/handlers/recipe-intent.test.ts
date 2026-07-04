import { describe, expect, it } from "vitest";
import { parseRecipeIntent } from "./recipe-intent";

describe("parseRecipeIntent", () => {
  it("parses ingredient additions", () => {
    expect(parseRecipeIntent("добавь яйца")).toMatchObject({
      kind: "add_ingredients",
      payload: "яйца",
    });
  });

  it("parses replacements", () => {
    expect(parseRecipeIntent("замени маскарпоне на творожный сыр")).toMatchObject({
      kind: "replace_ingredients",
      target: "маскарпоне",
      replacement: "творожный сыр",
    });
  });

  it("parses recipe detail requests", () => {
    expect(parseRecipeIntent("покажи рецепт 2")).toMatchObject({
      kind: "show_recipe_details",
      recipeIndex: 2,
    });
  });

  it("marks unknown follow-ups explicitly", () => {
    expect(parseRecipeIntent("что скажешь?")).toMatchObject({
      kind: "unknown",
    });
  });
});
