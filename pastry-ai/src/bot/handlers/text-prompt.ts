import type { Composer } from "grammy";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { splitTelegramText } from "./recipes";
import { formatTextPromptResponseForTelegram } from "./text-prompt-format";
import { addMenuKeyboard, replyChunks } from "../menu-return";

type TextPromptService = {
  execute(input: {
    feature: "recipe-margin" | "recipe-recalculation";
    text: string;
    promptSlug?: string;
    recipeContext?: string;
  }): Promise<string>;
};

type ConversationLogService = {
  startConversation(input: { userId: string; feature: string }): Promise<string>;
  appendUserMessage(input: { conversationId: string; content: string }): Promise<void>;
  appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
  appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
};

const textOnlyFeatures = ["recipe-margin", "recipe-recalculation"] as const;

const processingMessages: Record<string, string> = {
  "recipe-margin": "Рассчитываю себестоимость и маржу. Это может занять несколько секунд.",
  "recipe-recalculation": "Пересчитываю рецепт под новые параметры. Это может занять несколько секунд.",
};

export function registerTextPromptHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    textPromptService: TextPromptService;
    conversationLogService?: ConversationLogService;
  },
): void {
  composer.on("message:text", async (ctx, next) => {
    const feature = ctx.session.lastFeature;

    if (!feature || !textOnlyFeatures.includes(feature as typeof textOnlyFeatures[number])) {
      return next();
    }

    const text = ctx.message.text.trim();

    if (text.length < 3) {
      await ctx.reply("Пожалуйста, напишите подробнее, чтобы я могла обработать запрос.");
      return;
    }

    await ctx.reply(processingMessages[feature] ?? "Обрабатываю запрос...");

    const log = dependencies.conversationLogService;
    let convId: string | undefined;

    if (log) {
      const { prisma } = await import("@/db/prisma");
      const user = await prisma.user.findFirst({ where: { telegramId: String(ctx.from?.id ?? "") }, select: { id: true } });
      if (user) {
        convId = await log.startConversation({ userId: user.id, feature: feature });
        await log.appendUserMessage({ conversationId: convId, content: text });
      }
    }

    try {
      const recipeContext = ctx.session.selectedGeneratedRecipeText;
      ctx.session.selectedGeneratedRecipeText = undefined;
      ctx.session.selectedGeneratedRecipeId = undefined;

      const result = await dependencies.textPromptService.execute({
        feature: feature as "recipe-margin" | "recipe-recalculation",
        text,
        promptSlug: ctx.session.lastPromptSlug,
        recipeContext,
      });

      const formattedResult = formatTextPromptResponseForTelegram(result);

      const chunks = splitTelegramText(formattedResult);
      await replyChunks(ctx.reply.bind(ctx), chunks);

      if (log && convId) {
        await log.appendAssistantMessage({ conversationId: convId, content: formattedResult });
      }
    } catch (error) {
      console.error("Text prompt failed", error);
      if (log && convId) {
        await log.appendErrorMessage({ conversationId: convId, content: `Text prompt failed: ${error instanceof Error ? error.message : String(error)}` });
      }
      const prepared = addMenuKeyboard("Произошла ошибка. Попробуйте ещё раз позже.");
      await ctx.reply(prepared.text, { reply_markup: prepared.reply_markup });
    }
  });
}

export function shouldHandleTextPrompt(session: BotSession) {
  return (
    session.lastFeature === "recipe-margin" || session.lastFeature === "recipe-recalculation"
  );
}
