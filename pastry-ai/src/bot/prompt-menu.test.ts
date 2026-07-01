import { describe, expect, it } from "vitest";
import {
  buildPromptMenuKeyboard,
  buildPromptMenuMessage,
  getPromptSelectionText,
  mapPromptsToMenuItems,
} from "./prompt-menu";

describe("prompt menu", () => {
  it("builds one selection button per active prompt title", () => {
    const items = mapPromptsToMenuItems([
      {
        feature: "recipes",
        slug: "recipe-from-ingredients",
        title: "Рецепт по ингредиентам",
      },
      {
        feature: "vision",
        slug: "dessert-identification",
        title: "Разобрать десерт по фото",
      },
    ]);

    const keyboard = buildPromptMenuKeyboard(items);

    expect(keyboard.inline_keyboard.flat()).toEqual([
      {
        callback_data: "prompt:recipes:recipe-from-ingredients",
        text: "Рецепт по ингредиентам",
      },
      {
        callback_data: "prompt:vision:dessert-identification",
        text: "Разобрать десерт по фото",
      },
    ]);
  });

  it("uses Russian fallback titles when a prompt title is empty", () => {
    expect(
      mapPromptsToMenuItems([
        { feature: "vision", slug: "dessert-identification", title: "" },
      ])[0]?.title,
    ).toBe("Разобрать десерт по фото");
  });

  it("uses a Russian working menu message", () => {
    expect(buildPromptMenuMessage("Анна")).toContain("Анна");
    expect(buildPromptMenuMessage("Анна")).toContain("выберите");
  });

  it("asks for a photo after selecting the vision prompt", () => {
    expect(
      getPromptSelectionText({
        feature: "vision",
        slug: "dessert-identification",
        title: "Разобрать десерт по фото",
      }),
    ).toContain("Отправьте фото десерта");
  });
});
