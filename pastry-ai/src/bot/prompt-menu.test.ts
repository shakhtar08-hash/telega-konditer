import { describe, expect, it } from "vitest";
import {
  buildPromptMenuKeyboard,
  buildPromptMenuMessage,
  getPromptSelectionText,
  mapPromptsToMenuItems,
  resolveBotMenuUrl,
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
    expect(buildPromptMenuMessage()).toContain("\n\n");
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

  it("asks for a photo after selecting the photoshoot prompt", () => {
    expect(
      getPromptSelectionText({
        feature: "photoshoot",
        slug: "product-photo",
        title: "Стилизация фото десерта",
      }),
    ).toContain("7 вариантов");
  });

  it("uses the menu button description as the full selection message", () => {
    expect(
      getPromptSelectionText({
        description: "Custom selection message",
        feature: "recipes",
        slug: "recipe-from-ingredients",
        title: "Recipe button",
      }),
    ).toBe("Custom selection message");
  });

  it("resolves base URL placeholders for Telegram URL buttons", () => {
    process.env.APP_BASE_URL = "https://pastry.example.com";

    expect(resolveBotMenuUrl("{{baseUrl}}/pay")).toBe(
      "https://pastry.example.com/pay",
    );
  });
});
