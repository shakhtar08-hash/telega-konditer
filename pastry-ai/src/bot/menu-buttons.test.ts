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
        fullWidth: false,
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
        fullWidth: false,
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
        fullWidth: false,
        text: "🍰 Создать рецепт",
      },
      {
        fullWidth: false,
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

  it("renders fullWidth button on its own row", () => {
    const items = mapBotMenuButtonsToItems([
      {
        actionType: "PROMPT",
        active: true,
        emoji: "🍰",
        fullWidth: false,
        id: "button_recipe",
        label: "Создать рецепт",
        promptFeature: "recipes",
        promptSlug: "recipe-from-ingredients",
        sortOrder: 1,
        url: null,
      },
      {
        actionType: "PROMPT",
        active: true,
        emoji: "📸",
        fullWidth: true,
        id: "button_photoshoot",
        label: "Создать фото",
        promptFeature: "photoshoot",
        promptSlug: "product-photo",
        sortOrder: 2,
        url: null,
      },
      {
        actionType: "PROMPT",
        active: true,
        emoji: "🎨",
        fullWidth: false,
        id: "button_style",
        label: "Фото по стилю",
        promptFeature: "photoshoot-pick-style",
        promptSlug: "pick-style",
        sortOrder: 3,
        url: null,
      },
    ]);

    const keyboard = buildBotMenuKeyboard(items);
    expect(keyboard.inline_keyboard).toHaveLength(3);
    expect(keyboard.inline_keyboard[0]).toHaveLength(1);
    expect(keyboard.inline_keyboard[1]).toHaveLength(1);
    expect(keyboard.inline_keyboard[2]).toHaveLength(1);
  });
});
