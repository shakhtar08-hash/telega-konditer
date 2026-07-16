import type { StructuredRecipe } from "@/ai/schemas/recipe";
import { prisma } from "@/db/prisma";
import { createGeneratedRecipeContextRepository } from "@/db/repositories/generated-recipe-context-repository";
import {
  formatRecipeForTelegram,
} from "@/features/recipes/recipe-presenter";
import type { Composer } from "grammy";
import {
  clearScenarioSession,
  type BotSession,
  type PastryBotContext,
} from "../context";
import { resolveUserIdByTelegramId } from "../user-id";
import { parseRecipeIntent } from "./recipe-intent";
import { applyRecipeIntent, type RecipeStateAction } from "./recipe-state";
import { addMenuKeyboard } from "../menu-return";

type RecipeService = {
  createFromIngredients(input: {
    ingredientsText: string;
    promptSlug?: string;
    excludeRecipes?: string[];
  }): Promise<{
    recipes: StructuredRecipe[];
  }>;
};

type GeneratedRecipeContextRepository = ReturnType<
  typeof createGeneratedRecipeContextRepository
>;

type ConversationLogService = {
  startConversation(input: { userId: string; feature: string }): Promise<string>;
  appendUserMessage(input: { conversationId: string; content: string; caption?: string }): Promise<void>;
  appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
  appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
};

const processingMessage =
  "Готовлю варианты десертов по вашим ингредиентам. Это может занять несколько секунд.";
const processingBestRecipeMessage =
  "Ищу лучший рецепт по вашему запросу. Это может занять несколько секунд.";
const stoppedMessage =
  "Сценарий остановлен. Откройте /menu, чтобы выбрать новый.";
const telegramMessageLimit = 3900;
const missingProfileMessage =
  "Не удалось найти ваш профиль в базе. Нажмите /start и попробуйте ещё раз.";

export function getRecipeImageGenerationConfig() {
  return {
    model: "flux-kontext-pro",
    provider: "kie" as const,
  };
}

export function registerRecipeTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    recipeService: RecipeService;
    generatedRecipeContextRepository: GeneratedRecipeContextRepository;
    conversationLogService?: ConversationLogService;
  },
): void {
  composer.command("stop", async (ctx) => {
    clearScenarioSession(ctx.session);

    await ctx.reply(stoppedMessage);
  });

  composer.on("message:text", async (ctx, next) => {
    if (!shouldHandleRecipeText(ctx.session, ctx.message.text)) {
      return next();
    }

    const text = ctx.message.text;

    if (ctx.session.lastPromptSlug === "recipe-from-ingredients") {
      return handleIngredientRecipe(ctx, text, dependencies);
    }

    if (ctx.session.lastPromptSlug === "best-recipe-search") {
      return handleBestRecipeSearch(ctx, text, dependencies);
    }

    return handleSimpleRecipe(ctx, text, dependencies);
  });

  composer.callbackQuery(/^create_another_recipe:(.+)$/, async (ctx) => {
    const currentRecipeId = ctx.match[1];

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.answerCallbackQuery();
      await ctx.reply(missingProfileMessage);
      return;
    }

    const currentRecipe =
      await dependencies.generatedRecipeContextRepository.findByIdForUser(
        currentRecipeId,
        userId,
      );

    if (!currentRecipe) {
      await ctx.answerCallbackQuery();
      await ctx.reply("Этот рецепт больше не доступен.");
      return;
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(ctx.session.processingText || processingMessage);

    const excludeRecipes = ctx.session.givenRecipeNames ?? [];

    const recipeOutput = await dependencies.recipeService.createFromIngredients({
      ingredientsText: ctx.session.recipeSearchQuery ?? currentRecipe.recipeText,
      promptSlug: ctx.session.lastPromptSlug,
      excludeRecipes,
    });

    const recipe = recipeOutput.recipes[0];
    if (!recipe) {
      await ctx.reply("Не удалось сгенерировать новый рецепт. Попробуйте ещё раз.");
      return;
    }

    const singleText = formatSingleRecipeForTelegram(recipe, 0);

    const saved = await dependencies.generatedRecipeContextRepository.create({
      userId,
      recipeText: singleText,
      recipeJson: recipe,
      imageUrl: null,
      source: "create_recipe",
    });

    ctx.session.selectedGeneratedRecipeId = saved.id;
    ctx.session.selectedGeneratedRecipeText = singleText;
    ctx.session.givenRecipeIds = [...(ctx.session.givenRecipeIds ?? []), saved.id];
    ctx.session.givenRecipeNames = [...(ctx.session.givenRecipeNames ?? []), recipe.name];

    const chunks = splitTelegramText(singleText);
    for (let ci = 0; ci < chunks.length; ci++) {
      const isLast = ci === chunks.length - 1;
      await ctx.reply(chunks[ci], isLast ? { reply_markup: buildRecipeActionKeyboard(saved.id) } : undefined);
    }
  });
}

export function shouldHandleRecipeText(session: BotSession, text = "") {
  return (
    !text.trim().startsWith("/") &&
    (session.lastFeature === "recipes" || session.lastFeature === "best-recipe-search") &&
    Boolean(session.lastPromptSlug)
  );
}

async function sendRecipe(
  ctx: PastryBotContext,
  recipe: StructuredRecipe,
  index: number,
  dependencies: {
    generatedRecipeContextRepository: GeneratedRecipeContextRepository;
    conversationLogService?: ConversationLogService;
  },
  options?: { action?: "create_recipe" | "create_another"; sourceText?: string; conversationId?: string; conversationLogService?: ConversationLogService },
) {
  const userId = await resolveUserIdByTelegramId(
    prisma.user,
    String(ctx.from?.id ?? ""),
  );

  if (!userId) {
    await ctx.reply(missingProfileMessage);
    return;
  }

  const singleText = formatSingleRecipeForTelegram(recipe, index);

  const saved = await dependencies.generatedRecipeContextRepository.create({
    userId,
    recipeText: singleText,
    recipeJson: recipe,
    imageUrl: null,
    source: options?.action ?? "create_recipe",
  });

  ctx.session.selectedGeneratedRecipeId = saved.id;
  ctx.session.selectedGeneratedRecipeText = singleText;
  ctx.session.givenRecipeIds = [...(ctx.session.givenRecipeIds ?? []), saved.id];
  ctx.session.givenRecipeNames = [...(ctx.session.givenRecipeNames ?? []), recipe.name];

  const chunks = splitTelegramText(singleText);
  for (let ci = 0; ci < chunks.length; ci++) {
    const isLast = ci === chunks.length - 1;
    await ctx.reply(chunks[ci], isLast ? { reply_markup: buildRecipeActionKeyboard(saved.id) } : undefined);
  }

  if (dependencies.conversationLogService && options?.conversationId) {
    await dependencies.conversationLogService.appendAssistantMessage({
      conversationId: options.conversationId,
      content: singleText,
    });
  }
}

async function handleIngredientRecipe(
  ctx: PastryBotContext,
  text: string,
  dependencies: {
    recipeService: RecipeService;
    generatedRecipeContextRepository: GeneratedRecipeContextRepository;
    conversationLogService?: ConversationLogService;
  },
) {
  const intent = parseRecipeIntent(text);
  const result = applyRecipeIntent(ctx.session, intent);

  if (result.action === "ask_for_ingredients") {
    await ctx.reply(
      "Сначала пришлите список ингредиентов, с которыми будем работать.",
    );
    return;
  }

  if (result.action === "clarify") {
    await ctx.reply(
      "Уточните, пожалуйста: добавить ингредиенты, убрать что-то или показать рецепт из найденных вариантов?",
    );
    return;
  }

  if (result.action === "show_all") {
    await ctx.reply(
      "Сначала соберём список вариантов по ингредиентам, а потом сможем показать всё.",
    );
    return;
  }

  if (result.action === "show_one") {
    await ctx.reply(
      `Показываю рецепт №${result.recipeIndex}.`,
    );
    return;
  }

  await ctx.reply(ctx.session.processingText || processingMessage);

  const log = dependencies.conversationLogService;
  let convId: string | undefined;

  if (log) {
    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );
    if (userId) {
      convId = await log.startConversation({
        userId,
        feature: ctx.session.lastPromptSlug ?? "recipes",
      });
      await log.appendUserMessage({ conversationId: convId, content: text });
    }
  }

  const ingredientsText = buildRecipePromptText(
    text,
    ctx.session.lastRecipeRequestText,
    result.promptText,
  );

  const excludeRecipes = ctx.session.givenRecipeNames ?? [];

  const recipeOutput = await dependencies.recipeService.createFromIngredients({
    ingredientsText,
    promptSlug: ctx.session.lastPromptSlug,
    excludeRecipes,
  });

  ctx.session.recipeSearchQuery = ctx.session.recipeSearchQuery ?? ingredientsText;
  ctx.session.lastRecipeRequestText = result.promptText;

  const recipe = recipeOutput.recipes[0];
  if (!recipe) {
    await ctx.reply("Не удалось сгенерировать рецепт. Попробуйте ещё раз.");
    return;
  }

  await sendRecipe(ctx, recipe, 0, dependencies, { conversationId: convId });
}

async function handleBestRecipeSearch(
  ctx: PastryBotContext,
  text: string,
  dependencies: {
    recipeService: RecipeService;
    generatedRecipeContextRepository: GeneratedRecipeContextRepository;
    conversationLogService?: ConversationLogService;
  },
) {
  await ctx.reply(ctx.session.processingText || processingBestRecipeMessage);

  const log = dependencies.conversationLogService;
  let convId: string | undefined;

  if (log) {
    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );
    if (userId) {
      convId = await log.startConversation({
        userId,
        feature: ctx.session.lastPromptSlug ?? "best-recipe-search",
      });
      await log.appendUserMessage({ conversationId: convId, content: text });
    }
  }

  const excludeRecipes = ctx.session.givenRecipeNames ?? [];

  const recipeOutput = await dependencies.recipeService.createFromIngredients({
    ingredientsText: text,
    promptSlug: ctx.session.lastPromptSlug,
    excludeRecipes,
  });

  ctx.session.recipeSearchQuery = ctx.session.recipeSearchQuery ?? text;
  ctx.session.lastRecipeRequestText = text;

  const recipe = recipeOutput.recipes[0];
  if (!recipe) {
    await ctx.reply("Не удалось сгенерировать рецепт. Попробуйте ещё раз.");
    return;
  }

  await sendRecipe(ctx, recipe, 0, dependencies, { conversationId: convId });
}

async function handleSimpleRecipe(
  ctx: PastryBotContext,
  text: string,
  dependencies: {
    recipeService: RecipeService;
    generatedRecipeContextRepository: GeneratedRecipeContextRepository;
    conversationLogService?: ConversationLogService;
  },
) {
  return handleBestRecipeSearch(ctx, text, dependencies);
}

export function splitTelegramText(
  text: string,
  limit = telegramMessageLimit,
): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let current = "";

  for (const paragraph of paragraphs) {
    const separator = current ? "\n\n" : "";
    const next = `${current}${separator}${paragraph}`;

    if (next.length <= limit) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= limit) {
      current = paragraph;
      continue;
    }

    for (let index = 0; index < paragraph.length; index += limit) {
      chunks.push(paragraph.slice(index, index + limit));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export async function replyWithMarkdownSafe(ctx: PastryBotContext, text: string) {
  try {
    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply(text);
  }
}

export function buildRecipePromptText(
  currentText: string,
  previousRecipeRequestText?: string,
  currentIngredientsText?: string,
) {
  if (!previousRecipeRequestText || !isRecipeFollowUp(currentText)) {
    return currentIngredientsText ?? currentText;
  }

  const effectiveIngredients = currentIngredientsText ?? currentText;

  return [
    `Предыдущие ингредиенты пользователя:\n${previousRecipeRequestText}`,
    "",
    `Новый запрос пользователя:\n${currentText}`,
    "",
    `Актуальный список ингредиентов для нового ответа:\n${effectiveIngredients}`,
    "",
    "Это продолжение текущего сценария. Используй именно обновлённый список ингредиентов и пересобери ответ. Не повторяй прошлый результат без учёта нового сообщения.",
  ].join("\n");
}

export function formatSingleRecipeForTelegram(
  recipe: StructuredRecipe,
  index: number,
) {
  return formatRecipeForTelegram(recipe, index);
}

export function buildRecipeActionKeyboard(recipeId: string) {
  return {
    inline_keyboard: [
      [{ text: "🍳 Создать ещё 1 рецепт", callback_data: `create_another_recipe:${recipeId}` }],
      [{ text: "📸 Создать фото десерта (1 печенька)", callback_data: `create_recipe_photo:${recipeId}` }],
      [{ text: "✨ Создать карточку рецепта (1 печенька)", callback_data: `create_recipe_card:${recipeId}` }],
      [{ text: "📏 Пересчитать рецепт", callback_data: `recipe_recalculate:${recipeId}` }],
      [{ text: "👨‍🍳 Задать вопрос", callback_data: `ask_chef_recipe:${recipeId}` }],
    ],
  };
}

export function shouldGenerateRecipeSearch(action: RecipeStateAction["action"]) {
  return action === "search";
}

function isRecipeFollowUp(text: string) {
  const normalized = text.trim().toLowerCase();

  return (
    normalized === "покажи все" ||
    normalized.startsWith("покажи рецепт") ||
    normalized.startsWith("покажи полностью") ||
    normalized.startsWith("давай все") ||
    normalized.startsWith("давай добавим") ||
    normalized.startsWith("а если ") ||
    normalized.startsWith("если добавить") ||
    normalized.includes("добавить в список")
  );
}