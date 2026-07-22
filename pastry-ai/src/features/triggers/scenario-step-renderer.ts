import { prisma } from "@/db/prisma";
import type { ScenarioButtonRecord } from "@/features/scenarios/scenario-types";
import { resolveTelegramPhotoInput } from "@/bot/telegram-media";

type TelegramButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };

export type ScenarioButtonRuntimeRecord = Pick<
  ScenarioButtonRecord,
  "actionType" | "actionValue" | "id" | "sortOrder" | "stepId" | "text" | "transitionMode"
>;

type ScenarioBot = {
  api: {
    sendMessage(
      chatId: string,
      text: string,
      options: { reply_markup: ReturnType<typeof buildScenarioReplyMarkup> },
    ): Promise<unknown>;
    sendPhoto(
      chatId: string,
      photo: string | import("grammy").InputFile,
      options: {
        caption: string;
        reply_markup: ReturnType<typeof buildScenarioReplyMarkup>;
      },
    ): Promise<unknown>;
  };
};

function resolveScenarioRuntimeUrl(
  value: string,
  context?: { telegramId?: string | null },
): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return trimmedValue;
  }

  const baseUrl = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const telegramId = context?.telegramId?.trim() ?? "";
  const templatedValue = trimmedValue
    .replaceAll("{{baseUrl}}", baseUrl)
    .replaceAll("{{telegramId}}", telegramId);

  try {
    return new URL(templatedValue, `${baseUrl}/`).toString();
  } catch {
    return templatedValue;
  }
}

export function buildScenarioCallbackData(buttonId: string): string {
  const callbackData = `flow:${buttonId}`;

  if (Buffer.byteLength(callbackData, "utf8") > 64) {
    throw new Error("Scenario callback payload exceeds Telegram limit");
  }

  return callbackData;
}

export function buildScenarioReplyMarkup(
  buttons: ScenarioButtonRuntimeRecord[],
  context?: { telegramId?: string | null },
) {
  const inlineKeyboard = buttons
    .map((button): TelegramButton[] | null => {
      const text = button.text.trim();

      if (!text) {
        return null;
      }

      if (button.actionType === "URL") {
        const url = button.actionValue?.trim();
        return url
          ? [{ text, url: resolveScenarioRuntimeUrl(url, context) }]
          : null;
      }

      return [{ text, callback_data: buildScenarioCallbackData(button.id) }];
    })
    .filter((row): row is TelegramButton[] => row !== null);

  return inlineKeyboard.length > 0
    ? { inline_keyboard: inlineKeyboard }
    : undefined;
}

export async function sendScenarioStep(
  bot: ScenarioBot,
  chatId: string,
  stepId: string,
): Promise<void> {
  const step = await prisma.scenarioStep.findUnique({
    include: {
      buttons: {
        orderBy: { sortOrder: "asc" },
      },
    },
    where: { id: stepId },
  });

  if (!step) {
    throw new Error(`Scenario step ${stepId} was not found`);
  }

  const replyMarkup = buildScenarioReplyMarkup(
    step.buttons as ScenarioButtonRuntimeRecord[],
    { telegramId: chatId },
  );

  if (step.imageUrl) {
    await bot.api.sendPhoto(chatId, resolveTelegramPhotoInput(
      resolveScenarioRuntimeUrl(step.imageUrl, {
        telegramId: chatId,
      }),
    ), {
      caption: step.messageText,
      reply_markup: replyMarkup,
    });
    return;
  }

  await bot.api.sendMessage(chatId, step.messageText, {
    reply_markup: replyMarkup,
  });
}
