import { describe, expect, it } from "vitest";
import {
  buildPromptMenuKeyboard,
  buildPromptMenuMessage,
  getPromptSelectionText,
  mapPromptsToMenuItems,
} from "./prompt-menu";

describe("prompt menu", () => {
  it("builds one selection button per active prompt", () => {
    const items = mapPromptsToMenuItems([
      {
        feature: "recipes",
        slug: "recipe-from-ingredients",
        title: "Рецепт по ингредиентам",
      },
      {
        feature: "photoshoot",
        slug: "product-photo",
        title: "ИИ-фотосессия",
      },
    ]);

    const keyboard = buildPromptMenuKeyboard(items);

    expect(keyboard.inline_keyboard.flat()).toEqual([
      {
        callback_data: "prompt:recipes:recipe-from-ingredients",
        text: "Рецепт по ингредиентам",
      },
      {
        callback_data: "prompt:photoshoot:product-photo",
        text: "ИИ-фотосессия",
      },
    ]);
  });

  it("uses a Russian working menu message", () => {
    expect(buildPromptMenuMessage("Анна")).toContain("Анна");
    expect(buildPromptMenuMessage("Анна")).toContain("выберите");
  });

  it("confirms selected prompt to the user", () => {
    expect(
      getPromptSelectionText({
        feature: "recipes",
        slug: "recipe-from-ingredients",
        title: "Рецепт по ингредиентам",
      }),
    ).toContain("Рецепт по ингредиентам");
  });
});
