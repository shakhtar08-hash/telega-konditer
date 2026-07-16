import type { Composer } from "grammy";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { splitTelegramText } from "./recipes";
import { formatTextPromptResponseForTelegram } from "./text-prompt-format";
import { addMenuKeyboard, replyChunks } from "../menu-return";

type FreeLessonService = {
  searchLessons(input: {
    topic: string;
    promptSlug?: string;
  }): Promise<string>;
};

type ConversationLogService = {
  startConversation(input: { userId: string; feature: string }): Promise<string>;
  appendUserMessage(input: { conversationId: string; content: string }): Promise<void>;
  appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
  appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
};

const processingMessage =
  "Ищу бесплатные видеоуроки по вашему запросу. Это может занять несколько секунд.";
const tooShortMessage =
  "Пожалуйста, напишите тему, по которой хотите найти бесплатные уроки. Например: «муссовые торты», «работа с шоколадом», «капкейки».";

export function registerFreeLessonTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    freeLessonService: FreeLessonService;
    conversationLogService?: ConversationLogService;
  },
): void {
  composer.on("message:text", async (ctx, next) => {
    if (!shouldHandleFreeLessonText(ctx.session, ctx.message.text)) {
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
        convId = await log.startConversation({ userId: user.id, feature: "free-lesson" });
        await log.appendUserMessage({ conversationId: convId, content: text });
      }
    }

    try {
      const result = await dependencies.freeLessonService.searchLessons({
        topic: text,
        promptSlug: ctx.session.lastPromptSlug,
      });
      const formattedResult = formatTextPromptResponseForTelegram(result);

      const chunks = splitTelegramText(formattedResult);
      await replyChunks(ctx.reply.bind(ctx), chunks);

      if (log && convId) {
        await log.appendAssistantMessage({ conversationId: convId, content: formattedResult });
      }
    } catch (error) {
      console.error("Free lesson search failed", error);
      if (log && convId) {
        await log.appendErrorMessage({ conversationId: convId, content: `Free lesson search failed: ${error instanceof Error ? error.message : String(error)}` });
      }
      const prepared = addMenuKeyboard("Произошла ошибка при поиске уроков. Попробуйте ещё раз позже.");
      await ctx.reply(prepared.text, { reply_markup: prepared.reply_markup });
    }
  });
}

export function shouldHandleFreeLessonText(session: BotSession, text = "") {
  return (
    !text.trim().startsWith("/") &&
    session.lastFeature === "free-lesson" &&
    Boolean(session.lastPromptSlug)
  );
}
