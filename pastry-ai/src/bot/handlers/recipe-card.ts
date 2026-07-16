import { prisma } from "@/db/prisma";
import { type Composer } from "grammy";
import type { InlineKeyboardButton } from "grammy/types";
import {
  type BotSession,
  type PastryBotContext,
} from "../context";
import { resolveUserIdByTelegramId } from "../user-id";
import { splitTelegramText, getRecipeImageGenerationConfig } from "./recipes";
import { toTelegramPhotoInput } from "./photoshoot";
import { templateNames, type CardTemplate } from "@/components/recipe-card/templates";
import type { StructuredRecipe } from "@/ai/schemas/recipe";
import { addMenuKeyboard, replyChunks } from "../menu-return";

type RecipeCardService = {
  createCard(input: {
    recipeText?: string;
    recipeJson?: StructuredRecipe;
    imageUrl?: string | null;
    promptSlug?: string;
    template?: CardTemplate;
  }): Promise<{ urls: string[] } | { text: string }>;
};

type TokenGuardService = {
  getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};

type ImageService = {
  generateImage(input: {
    provider: string;
    model: string;
    prompt: string;
    size?: string;
  }): Promise<{ url: string }>;
};

type GeneratedRecipeContextRecord = {
  id: string;
  userId: string;
  recipeText: string;
  recipeJson: StructuredRecipe | null;
  imageUrl: string | null;
  source: string;
  createdAt: Date;
};

type GeneratedRecipeContextRepository = {
  create(input: {
    userId: string;
    recipeText: string;
    recipeJson?: StructuredRecipe | null;
    imageUrl?: string | null;
    source: "create_recipe";
  }): Promise<GeneratedRecipeContextRecord>;
  findByIdForUser(id: string, userId: string): Promise<GeneratedRecipeContextRecord | null>;
};

const processingMessage =
  "Генерирую карточку рецепта. Это может занять до минуты.";
const tooShortMessage =
  "Пожалуйста, напишите рецепт для создания карточки. Укажите название, ингредиенты и пошаговое приготовление.";
const missingProfileMessage =
  "Не удалось найти ваш профиль. Нажмите /start и попробуйте ещё раз.";
const noTokensMessage =
  "У вас недостаточно токенов для генерации карточки. Пополните баланс в /menu.";
const photoProcessingMessage =
  "Генерирую фото десерта. Это может занять до минуты.";
const noRecipeMessage =
  "Не удалось найти рецепт. Создайте рецепт заново.";

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

export function registerRecipeContextCallbacks(
  composer: Composer<PastryBotContext>,
  dependencies: {
    recipeCardService: RecipeCardService;
    tokenGuard: TokenGuardService;
    imageService: ImageService;
    generatedRecipeContextRepository: GeneratedRecipeContextRepository;
  },
): void {
  composer.callbackQuery(/^create_recipe_card:(.+)$/, async (ctx) => {
    const recipeId = ctx.match[1];

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.answerCallbackQuery();
      await ctx.reply(missingProfileMessage);
      return;
    }

    const recipe =
      await dependencies.generatedRecipeContextRepository.findByIdForUser(
        recipeId,
        userId,
      );

    if (!recipe) {
      await ctx.answerCallbackQuery();
      await ctx.reply(noRecipeMessage);
      return;
    }

    const slots = await dependencies.tokenGuard.getAvailablePhotoSlots(
      userId,
      1,
    );

    if (slots < 1) {
      await ctx.answerCallbackQuery();
      await ctx.reply(noTokensMessage);
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(processingMessage);

    try {
      const result = await dependencies.recipeCardService.createCard({
        recipeText: recipe.recipeText,
        recipeJson: recipe.recipeJson ?? undefined,
        imageUrl: recipe.imageUrl,
        promptSlug: "recipe-card",
        template: "dark",
      });

      if ("urls" in result) {
        for (let i = 0; i < result.urls.length; i++) {
          const caption =
            i === 0
              ? "📋 Карточка рецепта готова!"
              : `📄 ${result.urls.length > 1 ? `Часть ${i + 1}/${result.urls.length}` : ""}`;
          await ctx.replyWithPhoto(
            toTelegramPhotoInput(result.urls[i], "recipe-card.png"),
            { caption },
          );
        }
      } else {
        const chunks = splitTelegramText(result.text);
        await replyChunks(ctx.reply.bind(ctx), chunks, { parse_mode: "Markdown" });
      }

      await dependencies.tokenGuard.chargeTokens(
        userId,
        "recipe-card",
        "recipe-card",
        1,
      );
    } catch (error) {
      console.error("Recipe card from context failed", error);
      await ctx.reply(
        "Произошла ошибка при создании карточки рецепта. Попробуйте ещё раз позже.",
      );
    }
  });

  composer.callbackQuery(/^create_recipe_photo:(.+)$/, async (ctx) => {
    const recipeId = ctx.match[1];

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.answerCallbackQuery();
      await ctx.reply(missingProfileMessage);
      return;
    }

    const recipe =
      await dependencies.generatedRecipeContextRepository.findByIdForUser(
        recipeId,
        userId,
      );

    if (!recipe) {
      await ctx.answerCallbackQuery();
      await ctx.reply(noRecipeMessage);
      return;
    }

    const slots = await dependencies.tokenGuard.getAvailablePhotoSlots(
      userId,
      1,
    );

    if (slots < 1) {
      await ctx.answerCallbackQuery();
      await ctx.reply(noTokensMessage);
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(photoProcessingMessage);

    try {
      const imageConfig = getRecipeImageGenerationConfig();
      const imagePrompt =
        (recipe.recipeJson as { imagePrompt?: string } | null)?.imagePrompt ??
        `${recipe.recipeText.slice(0, 200)} premium dessert photography`;

      const image = await dependencies.imageService.generateImage({
        provider: imageConfig.provider,
        model: imageConfig.model,
        prompt: imagePrompt,
      });

      await ctx.replyWithPhoto(
        toTelegramPhotoInput(image.url, "recipe-photo.png"),
      );

      await dependencies.tokenGuard.chargeTokens(
        userId,
        "recipes",
        "create_recipe_photo",
        1,
      );
    } catch (error) {
      console.error("Recipe photo generation failed", error);
      await ctx.reply(
        "Произошла ошибка при генерации фото. Попробуйте ещё раз позже.",
      );
    }
  });

  composer.callbackQuery(/^recipe_recalculate:(.+)$/, async (ctx) => {
    const recipeId = ctx.match[1];

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.answerCallbackQuery();
      await ctx.reply(missingProfileMessage);
      return;
    }

    const recipe =
      await dependencies.generatedRecipeContextRepository.findByIdForUser(
        recipeId,
        userId,
      );

    if (!recipe) {
      await ctx.answerCallbackQuery();
      await ctx.reply(noRecipeMessage);
      return;
    }

    ctx.session.lastFeature = "recipe-recalculation";
    ctx.session.lastPromptSlug = "recipe-recalculation";
    ctx.session.selectedGeneratedRecipeId = recipe.id;
    ctx.session.selectedGeneratedRecipeText = recipe.recipeText;
    await ctx.answerCallbackQuery();
    const recalcMsg = addMenuKeyboard("Напишите, что именно пересчитать в этом рецепте.");
    await ctx.reply(recalcMsg.text, { reply_markup: recalcMsg.reply_markup });
  });

  composer.callbackQuery(/^ask_chef_recipe:(.+)$/, async (ctx) => {
    const recipeId = ctx.match[1];

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.answerCallbackQuery();
      await ctx.reply(missingProfileMessage);
      return;
    }

    const recipe =
      await dependencies.generatedRecipeContextRepository.findByIdForUser(
        recipeId,
        userId,
      );

    if (!recipe) {
      await ctx.answerCallbackQuery();
      await ctx.reply(noRecipeMessage);
      return;
    }

    ctx.session.lastFeature = "ask-chef";
    ctx.session.lastPromptSlug = "ask-chef";
    ctx.session.selectedGeneratedRecipeId = recipe.id;
    ctx.session.selectedGeneratedRecipeText = recipe.recipeText;
    await ctx.answerCallbackQuery();
    const chefMsg = addMenuKeyboard("Напишите ваш вопрос по этому рецепту.");
    await ctx.reply(chefMsg.text, { reply_markup: chefMsg.reply_markup });
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
