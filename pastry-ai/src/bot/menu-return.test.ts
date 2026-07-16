import { describe, expect, it } from "vitest";
import { addMenuKeyboard, MENU_RETURN_CALLBACK } from "./menu-return";

describe("addMenuKeyboard", () => {
  it("adds a return-to-menu button to a bare text reply", () => {
    const result = addMenuKeyboard("Какой-то ответ");
    expect(result.reply_markup.inline_keyboard).toHaveLength(1);
    expect(result.reply_markup.inline_keyboard[0][0].text).toBe("📋 В меню");
    expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe(MENU_RETURN_CALLBACK);
  });

  it("preserves existing parse_mode in extras", () => {
    const result = addMenuKeyboard("Ответ", { parse_mode: "Markdown" });
    expect(result.parse_mode).toBe("Markdown");
  });

  it("preserves existing reply_markup when it has no inline_keyboard", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = { reply_markup: { keyboard: [["custom"]] as const } } as any;
    const result = addMenuKeyboard("Ответ", existing);
    expect(result.reply_markup.inline_keyboard).toHaveLength(1);
  });

  it("does NOT add the button when reply_markup already has a menu-return button", () => {
    const result = addMenuKeyboard("Ответ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 В меню", callback_data: MENU_RETURN_CALLBACK }],
        ],
      },
    });
    expect(result.reply_markup.inline_keyboard).toHaveLength(1);
  });

  it("appends menu-return button when inline_keyboard exists without it", () => {
    const result = addMenuKeyboard("Ответ", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Купить", url: "https://pay.me" }],
        ],
      },
    });
    expect(result.reply_markup.inline_keyboard).toHaveLength(2);
    expect(result.reply_markup.inline_keyboard[0][0].text).toBe("Купить");
    expect(result.reply_markup.inline_keyboard[1][0].text).toBe("📋 В меню");
  });
});

describe("MENU_RETURN_CALLBACK", () => {
  it("is a string constant", () => {
    expect(typeof MENU_RETURN_CALLBACK).toBe("string");
    expect(MENU_RETURN_CALLBACK).toBe("menu:return");
  });
});