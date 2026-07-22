import type { PastryBotContext } from "../context";
import {
  executeBotCommandAction,
  handleTariffPurchase,
  openMainMenu,
} from "../command-actions";
import {
  buildScenarioReplyMarkup,
  type ScenarioButtonRuntimeRecord,
} from "@/features/triggers/scenario-step-renderer";
import { prisma } from "@/db/prisma";
import { normalizeTariffPurchaseSlug } from "@/features/payments/tariff-purchase";
import { resolveTelegramPhotoInput } from "../telegram-media";

type ScenarioButtonWithStep = {
  actionType: string;
  actionValue: string | null;
  id: string;
  step: { id: string };
  transitionMode: string | null;
};

type ScenarioStepWithButtons = {
  buttons: ScenarioButtonRuntimeRecord[];
  id: string;
  imageUrl: string | null;
  messageText: string;
};

export function parseScenarioCallback(callbackData: string): string | null {
  const match = callbackData.match(/^flow:(.+)$/);
  return match?.[1] ?? null;
}

export async function handleScenarioButtonCallback(
  ctx: PastryBotContext,
): Promise<void> {
  const buttonId = parseScenarioCallback(ctx.callbackQuery?.data ?? "");

  if (!buttonId) {
    return;
  }

  const button = (await prisma.scenarioButton.findUnique({
    include: { step: true },
    where: { id: buttonId },
  })) as ScenarioButtonWithStep | null;

  if (!button) {
    await ctx.answerCallbackQuery({
      text: "Этот переход больше недоступен.",
    });
    return;
  }

  switch (button.actionType) {
    case "SCENARIO_STEP":
      await handleScenarioStepTransition(ctx, button);
      return;
    case "BOT_COMMAND":
      await ctx.answerCallbackQuery();
      await executeBotCommandAction(ctx, button.actionValue ?? "");
      return;
    case "TARIFF_PURCHASE":
      await ctx.answerCallbackQuery({ text: "Создаём ссылку на оплату…" });
      const tariffSlug = normalizeTariffPurchaseSlug(button.actionValue);
      if (tariffSlug) {
        const url = await handleTariffPurchase(ctx, {
          tariffSlug,
        });
        if (url) {
          try {
            await ctx.editMessageReplyMarkup({
              inline_keyboard: [[{ text: "💳 Оплатить", url }]],
            });
          } catch {
            await ctx.reply("💳 Оплатить", {
              reply_markup: {
                inline_keyboard: [[{ text: "💳 Оплатить", url }]],
              },
            });
          }
        }
        return;
      }
      break;
    case "MAIN_MENU":
      await ctx.answerCallbackQuery();
      await openMainMenu(ctx);
      return;
    default:
      await ctx.answerCallbackQuery({
        text: "Это действие не поддерживается.",
      });
  }
}

async function handleScenarioStepTransition(
  ctx: PastryBotContext,
  button: ScenarioButtonWithStep,
): Promise<void> {
  const stepId = button.actionValue?.trim();

  if (!stepId) {
    await ctx.answerCallbackQuery({
      text: "Этот переход больше недоступен.",
    });
    return;
  }

  const nextStep = (await prisma.scenarioStep.findUnique({
    include: {
      buttons: {
        orderBy: { sortOrder: "asc" },
      },
    },
    where: { id: stepId },
  })) as ScenarioStepWithButtons | null;

  if (!nextStep) {
    await ctx.answerCallbackQuery({
      text: "Этот переход больше недоступен.",
    });
    return;
  }

  await ctx.answerCallbackQuery();

  const replyMarkup = buildScenarioReplyMarkup(nextStep.buttons);

  if (button.transitionMode === "REPLACE_CURRENT") {
    await replaceCurrentScenarioMessage(ctx, nextStep, replyMarkup);
    return;
  }

  await sendNewScenarioMessage(ctx, nextStep, replyMarkup);
}

async function sendNewScenarioMessage(
  ctx: PastryBotContext,
  step: ScenarioStepWithButtons,
  replyMarkup: ReturnType<typeof buildScenarioReplyMarkup>,
): Promise<void> {
  if (step.imageUrl) {
    await ctx.replyWithPhoto(resolveTelegramPhotoInput(step.imageUrl), {
      caption: step.messageText,
      reply_markup: replyMarkup,
    });
    return;
  }

  await ctx.reply(step.messageText, {
    reply_markup: replyMarkup,
  });
}

async function replaceCurrentScenarioMessage(
  ctx: PastryBotContext,
  step: ScenarioStepWithButtons,
  replyMarkup: ReturnType<typeof buildScenarioReplyMarkup>,
): Promise<void> {
  const currentMessage = ctx.callbackQuery?.message;
  const currentKind = currentMessage && "photo" in currentMessage ? "photo" : "text";
  const nextKind = step.imageUrl ? "photo" : "text";

  if (currentKind !== nextKind) {
    await deleteCurrentScenarioMessage(ctx);
    await sendNewScenarioMessage(ctx, step, replyMarkup);
    return;
  }

  try {
    if (nextKind === "photo") {
      const imageUrl = step.imageUrl;
      if (!imageUrl) return;

      await ctx.editMessageMedia(
        {
          caption: step.messageText,
          media: resolveTelegramPhotoInput(imageUrl),
          type: "photo",
        },
        { reply_markup: replyMarkup },
      );
      return;
    }

    await ctx.editMessageText(step.messageText, {
      reply_markup: replyMarkup,
    });
  } catch {
    await deleteCurrentScenarioMessage(ctx);
    await sendNewScenarioMessage(ctx, step, replyMarkup);
  }
}

async function deleteCurrentScenarioMessage(ctx: PastryBotContext): Promise<void> {
  try {
    await ctx.deleteMessage();
  } catch {
    // The fallback must still send the next step if Telegram refuses deletion.
  }
}
