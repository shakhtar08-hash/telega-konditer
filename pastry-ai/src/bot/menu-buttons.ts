import type { InlineKeyboardMarkup } from "grammy/types";

type BotMenuButtonRecord = {
  actionType: "PROMPT" | "URL";
  active: boolean;
  emoji: string;
  id: string;
  label: string;
  promptFeature: string | null;
  promptSlug: string | null;
  sortOrder: number;
  url: string | null;
};

export type BotMenuItem = {
  callbackData?: string;
  text: string;
  url?: string;
};

export function mapBotMenuButtonsToItems(
  buttons: BotMenuButtonRecord[],
): BotMenuItem[] {
  return buttons
    .filter((button) => button.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((button) => {
      const text = [button.emoji, button.label].filter(Boolean).join(" ");

      if (button.actionType === "URL" && button.url) {
        return { text, url: button.url };
      }

      return {
        callbackData: `menu:${button.id}`,
        text,
      };
    });
}

export function buildBotMenuKeyboard(items: BotMenuItem[]): InlineKeyboardMarkup {
  const rows = [];

  for (let index = 0; index < items.length; index += 2) {
    rows.push(
      items.slice(index, index + 2).map((item) =>
        item.url
          ? { text: item.text, url: item.url }
          : { callback_data: item.callbackData ?? "", text: item.text },
      ),
    );
  }

  return { inline_keyboard: rows };
}

export function parseBotMenuCallback(callbackData: string): string | null {
  const match = callbackData.match(/^menu:(.+)$/);

  return match?.[1] ?? null;
}
