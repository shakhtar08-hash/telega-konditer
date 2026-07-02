import { describe, expect, it } from "vitest";
import {
  buildBotMenuKeyboard,
  mapBotMenuButtonsToItems,
  parseBotMenuCallback,
} from "./menu-buttons";

describe("bot menu buttons", () => {
  it("maps active database buttons to two-column Telegram menu items", () => {
    const items = mapBotMenuButtonsToItems([
      {
        actionType: "PROMPT",
        active: true,
        emoji: "🍰",
        id: "button_recipe",
        label: "Создать рецепт",
        promptFeature: "recipes",
        promptSlug: "recipe-from-ingredients",
        sortOrder: 1,
        url: null,
      },
      {
        actionType: "URL",
        active: true,
        emoji: "🎁",
        id: "button_bonus",
        label: "Бонусы",
        promptFeature: null,
        promptSlug: null,
        sortOrder: 2,
        url: "https://example.com/bonus",
      },
    ]);

    expect(items).toEqual([
      {
        callbackData: "menu:button_recipe",
        text: "🍰 Создать рецепт",
      },
      {
        text: "🎁 Бонусы",
        url: "https://example.com/bonus",
      },
    ]);
    expect(buildBotMenuKeyboard(items)).toEqual({
      inline_keyboard: [
        [
          {
            callback_data: "menu:button_recipe",
            text: "🍰 Создать рецепт",
          },
          {
            text: "🎁 Бонусы",
            url: "https://example.com/bonus",
          },
        ],
      ],
    });
  });

  it("parses bot menu callback ids", () => {
    expect(parseBotMenuCallback("menu:button_recipe")).toBe("button_recipe");
    expect(parseBotMenuCallback("prompt:recipes:recipe-from-ingredients")).toBeNull();
  });
});
