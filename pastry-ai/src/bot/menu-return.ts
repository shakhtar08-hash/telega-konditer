import type { InlineKeyboardButton } from "grammy/types";

export const MENU_RETURN_CALLBACK = "menu:return";

function isMenuReturnButton(button: InlineKeyboardButton): boolean {
  return "callback_data" in button && button.callback_data === MENU_RETURN_CALLBACK;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyExtras = Record<string, any>;

export function addMenuKeyboard(
  text: string,
  extras?: Record<string, unknown>,
): AnyExtras {
  const existingKeyboard = extras?.reply_markup as
    | { inline_keyboard?: InlineKeyboardButton[][] }
    | undefined;

  if (existingKeyboard?.inline_keyboard) {
    const hasReturn = existingKeyboard.inline_keyboard.some((row) =>
      row.some(isMenuReturnButton),
    );
    if (hasReturn) {
      return { text: text, ...(extras ?? {}) };
    }

    return {
      text: text,
      ...(extras ?? {}),
      reply_markup: {
        inline_keyboard: [
          ...existingKeyboard.inline_keyboard,
          [{ text: "📋 В меню", callback_data: MENU_RETURN_CALLBACK }],
        ],
      },
    };
  }

  return {
    text: text,
    ...(extras ?? {}),
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 В меню", callback_data: MENU_RETURN_CALLBACK }],
      ],
    },
  };
}

type ReplyFn = (text: string, extras?: Record<string, unknown>) => Promise<unknown>;

export function replyWithMenuButton(reply: ReplyFn) {
  return async (text: string, extras?: Record<string, unknown>) => {
    const prepared = addMenuKeyboard(text, extras);
    return reply(prepared.text, { reply_markup: prepared.reply_markup } as Record<string, unknown>);
  };
}

export async function replyChunks(
  reply: ReplyFn,
  chunks: string[],
  extras?: Record<string, unknown>,
): Promise<void> {
  for (const [index, chunk] of chunks.entries()) {
    if (index === chunks.length - 1) {
      const prepared = addMenuKeyboard(chunk, extras);
      await reply(prepared.text, { reply_markup: prepared.reply_markup } as Record<string, unknown>);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await reply(extras ? ({ text: chunk, ...extras } as any) : chunk);
    }
  }
}