import type { Composer } from "grammy";
import type { BotSession, PastryBotContext } from "../context";

type RecipeService = {
  createFromIngredients(input: {
    ingredientsText: string;
    promptSlug?: string;
  }): Promise<string>;
};

const processingMessage =
  "\u0413\u043e\u0442\u043e\u0432\u043b\u044e \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b \u0434\u0435\u0441\u0435\u0440\u0442\u043e\u0432 \u043f\u043e \u0432\u0430\u0448\u0438\u043c \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u0430\u043c. \u042d\u0442\u043e \u043c\u043e\u0436\u0435\u0442 \u0437\u0430\u043d\u044f\u0442\u044c \u043d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0435\u043a\u0443\u043d\u0434.";
const stoppedMessage =
  "\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d. \u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 /menu, \u0447\u0442\u043e\u0431\u044b \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u043d\u043e\u0432\u044b\u0439.";
const telegramMessageLimit = 3900;

export function registerRecipeTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: { recipeService: RecipeService },
): void {
  composer.command("stop", async (ctx) => {
    ctx.session.lastFeature = undefined;
    ctx.session.lastPromptSlug = undefined;
    ctx.session.lastRecipeRequestText = undefined;

    await ctx.reply(stoppedMessage);
  });

  composer.on("message:text", async (ctx) => {
    if (!shouldHandleRecipeText(ctx.session, ctx.message.text)) {
      return;
    }

    await ctx.reply(processingMessage);

    const ingredientsText = buildRecipePromptText(
      ctx.message.text,
      ctx.session.lastRecipeRequestText,
    );
    const recipeText = await dependencies.recipeService.createFromIngredients({
      ingredientsText,
      promptSlug: ctx.session.lastPromptSlug,
    });

    if (!isRecipeFollowUp(ctx.message.text)) {
      ctx.session.lastRecipeRequestText = ctx.message.text;
    }

    for (const chunk of splitTelegramText(recipeText)) {
      await ctx.reply(chunk);
    }
  });
}

export function shouldHandleRecipeText(session: BotSession, text = "") {
  return (
    !text.trim().startsWith("/") &&
    session.lastFeature === "recipes" &&
    Boolean(session.lastPromptSlug)
  );
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
) {
  if (!previousRecipeRequestText || !isRecipeFollowUp(currentText)) {
    return currentText;
  }

  return [
    `\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u0437\u0430\u043f\u0440\u043e\u0441 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f:\n${previousRecipeRequestText}`,
    "",
    `\u0422\u0435\u043a\u0443\u0449\u0435\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f:\n${currentText}`,
    "",
    "\u041e\u0442\u0432\u0435\u0442\u044c \u043f\u043e \u043f\u0440\u0430\u0432\u0438\u043b\u0430\u043c \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u043e\u0433\u043e \u043f\u0440\u043e\u043c\u0442\u0430, \u0443\u0447\u0438\u0442\u044b\u0432\u0430\u044f \u043f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u0437\u0430\u043f\u0440\u043e\u0441.",
  ].join("\n");
}

function isRecipeFollowUp(text: string) {
  const normalized = text.trim().toLowerCase();

  return (
    normalized === "\u043f\u043e\u043a\u0430\u0436\u0438 \u0432\u0441\u0435" ||
    normalized.startsWith("\u043f\u043e\u043a\u0430\u0436\u0438 \u0440\u0435\u0446\u0435\u043f\u0442") ||
    normalized.startsWith("\u043f\u043e\u043a\u0430\u0436\u0438 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e") ||
    normalized.startsWith("\u0434\u0430\u0432\u0430\u0439 \u0432\u0441\u0435")
  );
}
