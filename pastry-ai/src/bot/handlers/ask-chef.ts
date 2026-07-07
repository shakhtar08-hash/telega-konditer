import type { Composer } from "grammy";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { splitTelegramText, replyWithMarkdownSafe } from "./recipes";

type AskChefService = {
  askQuestion(input: {
    question: string;
    promptSlug?: string;
  }): Promise<string>;
};

const processingMessage =
  "Думаю над вашим вопросом. Это может занять несколько секунд.";
const tooShortMessage =
  "Пожалуйста, напишите ваш вопрос. Я помогу с рецептами, технологиями, ингредиентами и любыми другими вопросами по кондитерскому делу.";

export function registerAskChefTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    askChefService: AskChefService;
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

    await ctx.reply(processingMessage);

    try {
      const result = await dependencies.askChefService.askQuestion({
        question: text,
        promptSlug: ctx.session.lastPromptSlug,
      });

      for (const chunk of splitTelegramText(result)) {
        await replyWithMarkdownSafe(ctx, chunk);
      }
    } catch (error) {
      console.error("Ask chef failed", error);
      await ctx.reply(
        "Произошла ошибка при обработке вопроса. Попробуйте ещё раз позже.",
      );
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