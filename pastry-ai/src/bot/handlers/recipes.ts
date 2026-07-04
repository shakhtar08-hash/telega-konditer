import type { Composer } from "grammy";
import {
  clearScenarioSession,
  type BotSession,
  type PastryBotContext,
} from "../context";
import { parseRecipeIntent } from "./recipe-intent";
import { applyRecipeIntent, type RecipeStateAction } from "./recipe-state";

type RecipeService = {
  createFromIngredients(input: {
    ingredientsText: string;
    promptSlug?: string;
  }): Promise<string>;
};

const processingMessage =
  "Готовлю варианты десертов по вашим ингредиентам. Это может занять несколько секунд.";
const processingBestRecipeMessage =
  "Ищу лучший рецепт по вашему запросу. Это может занять несколько секунд.";
const stoppedMessage =
  "Сценарий остановлен. Откройте /menu, чтобы выбрать новый.";
const telegramMessageLimit = 3900;

export function registerRecipeTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: { recipeService: RecipeService },
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
  dependencies: { recipeService: RecipeService },
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
  const recipeText = await dependencies.recipeService.createFromIngredients({
    ingredientsText,
    promptSlug: ctx.session.lastPromptSlug,
  });

  ctx.session.lastRecipeRequestText = result.promptText;
  ctx.session.lastRecipeListText = recipeText;
  ctx.session.recipeScenarioStep = "results_shown";

  for (const chunk of splitTelegramText(recipeText)) {
    await ctx.reply(chunk);
  }
}

async function handleSimpleRecipe(
  ctx: PastryBotContext,
  text: string,
  dependencies: { recipeService: RecipeService },
) {
  await ctx.reply(processingBestRecipeMessage);

  const recipeText = await dependencies.recipeService.createFromIngredients({
    ingredientsText: text,
    promptSlug: ctx.session.lastPromptSlug,
  });

  ctx.session.lastRecipeRequestText = text;
  ctx.session.lastRecipeListText = recipeText;
  ctx.session.recipeScenarioStep = "results_shown";

  for (const chunk of splitTelegramText(recipeText)) {
    await ctx.reply(chunk);
  }
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
    `\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0435 \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u044b \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f:\n${previousRecipeRequestText}`,
    "",
    `\u041d\u043e\u0432\u044b\u0439 \u0437\u0430\u043f\u0440\u043e\u0441 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f:\n${currentText}`,
    "",
    `\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u0441\u043f\u0438\u0441\u043e\u043a \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u043e\u0432 \u0434\u043b\u044f \u043d\u043e\u0432\u043e\u0433\u043e \u043e\u0442\u0432\u0435\u0442\u0430:\n${effectiveIngredients}`,
    "",
    "\u042d\u0442\u043e \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0435\u043d\u0438\u0435 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u044f. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439 \u0438\u043c\u0435\u043d\u043d\u043e \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d\u043d\u044b\u0439 \u0441\u043f\u0438\u0441\u043e\u043a \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u043e\u0432 \u0438 \u043f\u0435\u0440\u0435\u0441\u043e\u0431\u0435\u0440\u0438 \u043e\u0442\u0432\u0435\u0442. \u041d\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0439 \u043f\u0440\u043e\u0448\u043b\u044b\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0431\u0435\u0437 \u0443\u0447\u0451\u0442\u0430 \u043d\u043e\u0432\u043e\u0433\u043e \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f.",
  ].join("\n");
}

export function shouldGenerateRecipeSearch(action: RecipeStateAction["action"]) {
  return action === "search";
}

function isRecipeFollowUp(text: string) {
  const normalized = text.trim().toLowerCase();

  return (
    normalized === "\u043f\u043e\u043a\u0430\u0436\u0438 \u0432\u0441\u0435" ||
    normalized.startsWith("\u043f\u043e\u043a\u0430\u0436\u0438 \u0440\u0435\u0446\u0435\u043f\u0442") ||
    normalized.startsWith("\u043f\u043e\u043a\u0430\u0436\u0438 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e") ||
    normalized.startsWith("\u0434\u0430\u0432\u0430\u0439 \u0432\u0441\u0435") ||
    normalized.startsWith("\u0434\u0430\u0432\u0430\u0439 \u0434\u043e\u0431\u0430\u0432\u0438\u043c") ||
    normalized.startsWith("\u0430 \u0435\u0441\u043b\u0438 ") ||
    normalized.startsWith("\u0435\u0441\u043b\u0438 \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c") ||
    normalized.includes("\u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432 \u0441\u043f\u0438\u0441\u043e\u043a")
  );
}
