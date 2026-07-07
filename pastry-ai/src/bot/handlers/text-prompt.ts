import type { Composer } from "grammy";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { splitTelegramText, replyWithMarkdownSafe } from "./recipes";

type TextPromptService = {
  execute(input: {
    feature: "recipe-margin" | "recipe-recalculation";
    text: string;
    promptSlug?: string;
  }): Promise<string>;
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
  },
): void {
  composer.on("message:text", async (ctx, next) => {
    const feature = ctx.session.lastFeature;

    if (!feature || !textOnlyFeatures.includes(feature as typeof textOnlyFeatures[number])) {
      return next();
    }

    const text = ctx.message.text.trim();

    if (text.length < 3) {
      await ctx.reply("Пожалуйста, напишите подробнее, чтобы я мог обработать запрос.");
      return;
    }

    await ctx.reply(processingMessages[feature] ?? "Обрабатываю запрос...");

    try {
      const result = await dependencies.textPromptService.execute({
        feature: feature as "recipe-margin" | "recipe-recalculation",
        text,
        promptSlug: ctx.session.lastPromptSlug,
      });

      for (const chunk of splitTelegramText(result)) {
        await replyWithMarkdownSafe(ctx, chunk);
      }
    } catch (error) {
      console.error("Text prompt failed", error);
      await ctx.reply("Произошла ошибка. Попробуйте ещё раз позже.");
    }
  });
}

export function shouldHandleTextPrompt(session: BotSession) {
  return (
    session.lastFeature === "recipe-margin" || session.lastFeature === "recipe-recalculation"
  );
}