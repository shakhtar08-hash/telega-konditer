import type { Composer } from "grammy";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { splitTelegramText, replyWithMarkdownSafe } from "./recipes";

type FreeLessonService = {
  searchLessons(input: {
    topic: string;
    promptSlug?: string;
  }): Promise<string>;
};

const processingMessage =
  "Ищу бесплатные видеоуроки по вашему запросу. Это может занять несколько секунд.";
const tooShortMessage =
  "Пожалуйста, напишите тему, по которой хотите найти бесплатные уроки. Например: «муссовые торты», «работа с шоколадом», «капкейки».";

export function registerFreeLessonTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    freeLessonService: FreeLessonService;
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

    await ctx.reply(processingMessage);

    try {
      const result = await dependencies.freeLessonService.searchLessons({
        topic: text,
        promptSlug: ctx.session.lastPromptSlug,
      });

      for (const chunk of splitTelegramText(result)) {
        await replyWithMarkdownSafe(ctx, chunk);
      }
    } catch (error) {
      console.error("Free lesson search failed", error);
      await ctx.reply(
        "Произошла ошибка при поиске уроков. Попробуйте ещё раз позже.",
      );
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