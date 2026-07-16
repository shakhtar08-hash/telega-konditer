import type { Composer } from "grammy";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { splitTelegramText } from "./recipes";
import { formatTextPromptResponseForTelegram } from "./text-prompt-format";
import { addMenuKeyboard, replyChunks } from "../menu-return";

type AskChefService = {
  askQuestion(input: {
    question: string;
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

const processingMessage =
  "Думаю над вашим вопросом. Это может занять несколько секунд.";
const tooShortMessage =
  "Пожалуйста, напишите ваш вопрос. Я помогу с рецептами, технологиями, ингредиентами и любыми другими вопросами по кондитерскому делу.";

export function registerAskChefTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    askChefService: AskChefService;
    conversationLogService?: ConversationLogService;
  },
): void {
  composer.on("message:text", async (ctx, next) => {
    if (!shouldHandleAskChefText(ctx.session, ctx.message.text)) {
      return next();
    }

    const text = ctx.message.text.trim();

    if (text.length < 3) {
      await ctx.reply(tooShortMessage);
      return;
    }

    await ctx.reply(ctx.session.processingText || processingMessage);

    const log = dependencies.conversationLogService;
    let convId: string | undefined;

    if (log) {
      const { prisma } = await import("@/db/prisma");
      const user = await prisma.user.findFirst({ where: { telegramId: String(ctx.from?.id ?? "") }, select: { id: true } });
      if (user) {
        convId = await log.startConversation({ userId: user.id, feature: "ask-chef" });
        await log.appendUserMessage({ conversationId: convId, content: text });
      }
    }

    try {
      const recipeContext = ctx.session.selectedGeneratedRecipeText;
      ctx.session.selectedGeneratedRecipeText = undefined;
      ctx.session.selectedGeneratedRecipeId = undefined;

      const result = await dependencies.askChefService.askQuestion({
        question: text,
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
      console.error("Ask chef failed", error);
      if (log && convId) {
        await log.appendErrorMessage({ conversationId: convId, content: `Ask chef failed: ${error instanceof Error ? error.message : String(error)}` });
      }
      const prepared = addMenuKeyboard("Произошла ошибка при обработке вопроса. Попробуйте ещё раз позже.");
      await ctx.reply(prepared.text, { reply_markup: prepared.reply_markup });
    }
  });
}

export function shouldHandleAskChefText(session: BotSession, text = "") {
  return (
    !text.trim().startsWith("/") &&
    session.lastFeature === "ask-chef" &&
    Boolean(session.lastPromptSlug)
  );
}
