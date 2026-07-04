import { describe, expect, it } from "vitest";
import type { BotSession } from "../context";
import { applyRecipeIntent } from "./recipe-state";

describe("applyRecipeIntent", () => {
  it("creates a new ingredient state from set_ingredients", () => {
    const session: BotSession = {};
    const result = applyRecipeIntent(session, {
      kind: "set_ingredients",
      payload: "сливки, клубника",
    });

    expect(result).toEqual({
      action: "search",
      promptText: "сливки, клубника",
    });
    expect(session.currentIngredientsText).toBe("сливки, клубника");
  });

  it("adds ingredients to existing state", () => {
    const session = {
      baseIngredientsText: "сливки, клубника",
      currentIngredientsText: "сливки, клубника",
    };
    const result = applyRecipeIntent(session, {
      kind: "add_ingredients",
      payload: "яйца",
    });

    expect(result.action).toBe("search");
    expect(session.currentIngredientsText).toContain("яйца");
  });

  it("asks for ingredients when refining without state", () => {
    const result = applyRecipeIntent({}, { kind: "add_ingredients", payload: "яйца" });
    expect(result).toEqual({ action: "ask_for_ingredients" });
  });
});
