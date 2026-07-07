import type { StructuredRecipe } from "@/ai/schemas/recipe";
import { prisma } from "@/db/prisma";
import {
  buildRecipeImagePrompt,
  formatRecipeOutputForTelegram,
} from "@/features/recipes/recipe-presenter";
import type { Composer } from "grammy";
import {
  clearScenarioSession,
  type BotSession,
  type PastryBotContext,
} from "../context";
import { resolveUserIdByTelegramId } from "../user-id";
import { toTelegramPhotoInput } from "./photoshoot";
import { parseRecipeIntent } from "./recipe-intent";
import { applyRecipeIntent, type RecipeStateAction } from "./recipe-state";

type RecipeService = {
  createFromIngredients(input: {
    ingredientsText: string;
    promptSlug?: string;
  }): Promise<{
    recipes: StructuredRecipe[];
  }>;
};

type TokenGuardService = {
  getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
  chargeTokens(
    userId: string,
    feature: string,
    promptSlug: string | null,
    imagesSent: number,
  ): Promise<void>;
};

type ImageService = {
  generateImage(input: {
    provider: string;
    model: string;
    prompt: string;
    size?: string;
  }): Promise<{ url: string }>;
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
    tokenGuard: TokenGuardService;
    imageService: ImageService;
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

    return handleSimpleRecipe(ctx, text, dependencies);
  });
}

export function shouldHandleRecipeText(session: BotSession, text = "") {
  return (
    !text.trim().startsWith("/") &&
    session.lastFeature === "recipes" &&
    Boolean(session.lastPromptSlug)
  );
}

async function handleIngredientRecipe(
  ctx: PastryBotContext,
  text: string,
  dependencies: {
    recipeService: RecipeService;
    tokenGuard: TokenGuardService;
    imageService: ImageService;
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
    if (ctx.session.lastRecipeListText) {
      for (const chunk of splitTelegramText(ctx.session.lastRecipeListText)) {
        await ctx.reply(chunk);
      }
      return;
    }

    await ctx.reply(
      "Сначала соберём список вариантов по ингредиентам, а потом сможем показать всё.",
    );
    return;
  }

  if (result.action === "show_one") {
    await ctx.reply(
      `Показываю рецепт №${result.recipeIndex}. На следующем шаге можно расширить это до выбора конкретного сохранённого варианта из списка.`,
    );
    return;
  }

  await ctx.reply(processingMessage);

  const ingredientsText = buildRecipePromptText(
    text,
    ctx.session.lastRecipeRequestText,
    result.promptText,
  );
  const recipeOutput = await dependencies.recipeService.createFromIngredients({
    ingredientsText,
    promptSlug: ctx.session.lastPromptSlug,
  });
  const recipeText = formatRecipeOutputForTelegram(recipeOutput);

  ctx.session.lastRecipeRequestText = result.promptText;
  ctx.session.lastRecipeListText = recipeText;
  ctx.session.recipeScenarioStep = "results_shown";

  for (const chunk of splitTelegramText(recipeText)) {
    await ctx.reply(chunk);
  }

  void generateDishPhotos(ctx, recipeOutput.recipes, dependencies);
}

async function generateDishPhotos(
  ctx: PastryBotContext,
  recipes: StructuredRecipe[],
  dependencies: { tokenGuard: TokenGuardService; imageService: ImageService },
) {
  try {
    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.reply(missingProfileMessage);
      return;
    }

    const slots = await dependencies.tokenGuard.getAvailablePhotoSlots(
      userId,
      recipes.length,
    );
    if (slots === 0) {
      if (recipes.length > 0) {
        await ctx.reply(
          "У вас недостаточно токенов для генерации фото. Пополните баланс в /menu.",
        );
      }
      return;
    }

    for (let i = 0; i < slots; i++) {
      const recipe = recipes[i];
      const imageConfig = getRecipeImageGenerationConfig();
      const image = await dependencies.imageService.generateImage({
        provider: imageConfig.provider,
        model: imageConfig.model,
        prompt: buildRecipeImagePrompt(recipe),
      });
      await ctx.replyWithPhoto(
        toTelegramPhotoInput(image.url, `${recipe.name}.png`),
        { caption: recipe.name },
      );
      await dependencies.tokenGuard.chargeTokens(
        userId,
        "recipes",
        ctx.session.lastPromptSlug ?? null,
        1,
      );
    }
  } catch (error) {
    console.error("Recipe photo generation failed", error);
    await ctx.reply(
      "Не удалось сгенерировать фото к рецепту. Текст рецепта уже отправлен.",
    );
  }
}

async function handleSimpleRecipe(
  ctx: PastryBotContext,
  text: string,
  dependencies: {
    recipeService: RecipeService;
    tokenGuard: TokenGuardService;
    imageService: ImageService;
  },
) {
  await ctx.reply(processingBestRecipeMessage);

  const recipeOutput = await dependencies.recipeService.createFromIngredients({
    ingredientsText: text,
    promptSlug: ctx.session.lastPromptSlug,
  });
  const recipeText = formatRecipeOutputForTelegram(recipeOutput);

  ctx.session.lastRecipeRequestText = text;
  ctx.session.lastRecipeListText = recipeText;
  ctx.session.recipeScenarioStep = "results_shown";

  for (const chunk of splitTelegramText(recipeText)) {
    await ctx.reply(chunk);
  }

  void generateDishPhotos(ctx, recipeOutput.recipes, dependencies);
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
