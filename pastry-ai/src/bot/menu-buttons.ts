import type { InlineKeyboardMarkup } from "grammy/types";

type BotMenuButtonRecord = {
  actionType: "PROMPT" | "URL" | "SCENARIO";
  active: boolean;
  emoji: string;
  fullWidth: boolean;
  id: string;
  label: string;
  promptFeature: string | null;
  promptSlug: string | null;
  sortOrder: number;
  url: string | null;
};

export type BotMenuItem = {
  callbackData?: string;
  fullWidth?: boolean;
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
        return { text, url: button.url, fullWidth: button.fullWidth };
      }

      return {
        callbackData: `menu:${button.id}`,
        text,
        fullWidth: button.fullWidth,
      };
    });
}

export function buildBotMenuKeyboard(items: BotMenuItem[]): InlineKeyboardMarkup {
  const rows: BotMenuItem[][] = [];

  for (const item of items) {
    if (item.fullWidth) {
      rows.push([item]);
    } else {
      const lastRow = rows[rows.length - 1];
      if (lastRow && lastRow.length < 2 && !lastRow[0]?.fullWidth) {
        lastRow.push(item);
      } else {
        rows.push([item]);
      }
    }
  }

  return {
    inline_keyboard: rows.map((row) =>
      row.map((item) =>
        item.url
          ? { text: item.text, url: item.url }
          : { callback_data: item.callbackData ?? "", text: item.text },
      ),
    ),
  };
}

export function parseBotMenuCallback(callbackData: string): string | null {
  const match = callbackData.match(/^menu:(.+)$/);

  return match?.[1] ?? null;
}
