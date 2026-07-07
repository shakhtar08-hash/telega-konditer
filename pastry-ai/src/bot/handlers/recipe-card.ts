import { prisma } from "@/db/prisma";
import { type Composer } from "grammy";
import type { InlineKeyboardButton } from "grammy/types";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { resolveUserIdByTelegramId } from "../user-id";
import { splitTelegramText } from "./recipes";
import { toTelegramPhotoInput } from "./photoshoot";
import { templateNames, type CardTemplate } from "@/components/recipe-card/templates";

type RecipeCardService = {
  createCard(input: {
    recipeText: string;
    promptSlug?: string;
    template: CardTemplate;
  }): Promise<{ urls: string[] } | { text: string }>;
};

type TokenGuardService = {
  getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};

const processingMessage =
  "Генерирую карточку рецепта. Это может занять до минуты.";
const tooShortMessage =
  "Пожалуйста, напишите рецепт для создания карточки. Укажите название, ингредиенты и пошаговое приготовление.";
const missingProfileMessage =
  "Не удалось найти ваш профиль. Нажмите /start и попробуйте ещё раз.";
const noTokensMessage =
  "У вас недостаточно токенов для генерации карточки. Пополните баланс в /menu.";

const templates: CardTemplate[] = ["minimal", "pinterest", "luxury", "dark"];

export function registerRecipeCardTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    recipeCardService: RecipeCardService;
    tokenGuard: TokenGuardService;
  },
): void {
  composer.on("message:text", async (ctx, next) => {
    if (!shouldHandleRecipeCardText(ctx.session, ctx.message.text)) {
      return next();
    }

    const text = ctx.message.text.trim();

    if (text.length < 10) {
      await ctx.reply(tooShortMessage);
      return;
    }

    ctx.session._pendingRecipeText = text;

    const keyboard: InlineKeyboardButton[][] = templates.map((t) => [
      { callback_data: `recipe-card-template:${t}`, text: templateNames[t] },
    ]);

    await ctx.reply("Выберите стиль карточки:", {
      reply_markup: { inline_keyboard: keyboard },
    });
  });
}

export function registerRecipeCardTemplateCallback(
  composer: Composer<PastryBotContext>,
  dependencies: {
    recipeCardService: RecipeCardService;
    tokenGuard: TokenGuardService;
  },
): void {
  composer.callbackQuery(/^recipe-card-template:(.+)$/, async (ctx) => {
    const template = ctx.match[1] as CardTemplate;
    const text = ctx.session._pendingRecipeText;

    if (!text || !templates.includes(template)) {
      await ctx.answerCallbackQuery();
      await ctx.reply("Что-то пошло не так. Попробуйте ещё раз.");
      return;
    }

    ctx.session.selectedCardTemplate = template;
    ctx.session._pendingRecipeText = undefined;

    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.reply(missingProfileMessage);
      return;
    }

    const slots = await dependencies.tokenGuard.getAvailablePhotoSlots(userId, 1);

    if (slots < 1) {
      await ctx.reply(noTokensMessage);
      return;
    }

    await ctx.reply(processingMessage);

    try {
      const result = await dependencies.recipeCardService.createCard({
        recipeText: text,
        promptSlug: ctx.session.lastPromptSlug,
        template,
      });

      if ("urls" in result) {
        for (let i = 0; i < result.urls.length; i++) {
          const caption =
            i === 0
              ? `📋 Карточка рецепта готова! (стиль: ${templateNames[template]})`
              : `📄 ${result.urls.length > 1 ? `Часть ${i + 1}/${result.urls.length}` : ""}`;
          await ctx.replyWithPhoto(
            toTelegramPhotoInput(result.urls[i], "recipe-card.png"),
            { caption },
          );
        }
      } else {
        for (const chunk of splitTelegramText(result.text)) {
          await ctx.reply(chunk, { parse_mode: "Markdown" });
        }
      }

      await dependencies.tokenGuard.chargeTokens(
        userId,
        "recipe-card",
        ctx.session.lastPromptSlug ?? null,
        1,
      );
    } catch (error) {
      console.error("Recipe card generation failed", error);
      await ctx.reply(
        "Произошла ошибка при создании карточки рецепта. Попробуйте ещё раз позже.",
      );
    }
  });
}

export function shouldHandleRecipeCardText(session: BotSession, text = "") {
  return (
    !text.trim().startsWith("/") &&
    session.lastFeature === "recipe-card" &&
    Boolean(session.lastPromptSlug) &&
    !session._pendingRecipeText
  );
}