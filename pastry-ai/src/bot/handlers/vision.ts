import type { Composer } from "grammy";
import type { PhotoSize } from "grammy/types";
import type { VisionOutput } from "@/ai/schemas/vision";
import type { PastryBotContext } from "../context";
import { splitTelegramText } from "./recipes";
import { addMenuKeyboard, replyChunks } from "../menu-return";

type VisionService = {
  identifyDessert(input: { imageUrl: string }): Promise<string>;
};

type ConversationLogService = {
  startConversation(input: { userId: string; feature: string }): Promise<string>;
  appendUserMessage(input: { conversationId: string; content: string; caption?: string }): Promise<void>;
  appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
  appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
};

const confidenceLabels: Record<VisionOutput["confidence"]["level"], string> = {
  high: "высокая",
  low: "низкая",
  medium: "средняя",
};

const difficultyLabels: Record<VisionOutput["difficulty"]["level"], string> = {
  beginner: "начинающий",
  intermediate: "опытный кондитер",
  professional: "профессиональный уровень",
};

export function registerVisionPhotoHandler(
  composer: Composer<PastryBotContext>,
  dependencies: { botToken: string; visionService: VisionService; conversationLogService?: ConversationLogService },
): void {
  composer.on("message:photo", async (ctx, next) => {
    if (
      ctx.session.lastFeature !== "vision" ||
      ctx.session.lastPromptSlug !== "dessert-identification"
    ) {
      return next();
    }

    const photo = getLargestPhoto(ctx.message.photo);

    if (!photo) {
      const notFound = addMenuKeyboard("Не получилось прочитать фото. Попробуйте отправить его ещё раз.");
      await ctx.reply(notFound.text, { reply_markup: notFound.reply_markup });
      return;
    }

    await ctx.reply(
      "Анализирую десерт по фото. Это может занять несколько секунд.",
    );

    const log = dependencies.conversationLogService;
    let convId: string | undefined;

    if (log) {
      const { prisma } = await import("@/db/prisma");
      const user = await prisma.user.findFirst({ where: { telegramId: String(ctx.from?.id ?? "") }, select: { id: true } });
      if (user) {
        convId = await log.startConversation({ userId: user.id, feature: "vision" });
        const caption = ctx.message.caption ?? "";
        await log.appendUserMessage({ conversationId: convId, content: "", caption });
      }
    }

    const file = await ctx.api.getFile(photo.file_id);

    if (!file.file_path) {
      const noPath = addMenuKeyboard("Telegram не вернул путь к фото. Попробуйте другое изображение.");
      await ctx.reply(noPath.text, { reply_markup: noPath.reply_markup });
      return;
    }

    const imageUrl = buildTelegramFileUrl(dependencies.botToken, file.file_path);
    try {
      const result = await dependencies.visionService.identifyDessert({ imageUrl });

      const chunks = splitTelegramText(result);
      await replyChunks(ctx.reply.bind(ctx), chunks);

      if (log && convId) {
        await log.appendAssistantMessage({ conversationId: convId, content: result });
      }
    } catch (error) {
      console.error("Vision analysis failed", error);
      if (log && convId) {
        await log.appendErrorMessage({ conversationId: convId, content: `Vision analysis failed: ${error instanceof Error ? error.message : String(error)}` });
      }
      const prepared = addMenuKeyboard("Произошла ошибка при анализе фото. Попробуйте ещё раз.");
      await ctx.reply(prepared.text, { reply_markup: prepared.reply_markup });
    }
  });
}

export function getLargestPhoto(photos: PhotoSize[]) {
  return [...photos].sort((a, b) => b.width * b.height - a.width * a.height)[0];
}

export function buildTelegramFileUrl(botToken: string, filePath: string) {
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

export function formatVisionResult(result: VisionOutput) {
  return [
    result.summary,
    "",
    `Уверенность: ${confidenceLabels[result.confidence.level]}`,
    result.confidence.reason,
    "",
    "Предполагаемый состав:",
    formatGroup("Основа", result.composition.base),
    formatGroup("Крем/мусс", result.composition.cream),
    formatGroup("Начинка", result.composition.filling),
    formatGroup("Покрытие", result.composition.coating),
    formatGroup("Декор", result.composition.decor),
    "",
    "Технологии:",
    formatList(result.techniques),
    "",
    "Возможные начинки:",
    formatList(result.fillingHypotheses),
    "",
    `Сложность: ${difficultyLabels[result.difficulty.level]}`,
    result.difficulty.reason,
    "",
    "Похожие десерты:",
    formatList(result.similarDesserts),
    "",
    `Похожий рецепт: ${result.recipeIdea.title}`,
    "Ингредиенты:",
    formatList(result.recipeIdea.ingredients),
    "Краткая технология:",
    formatList(result.recipeIdea.method),
    "",
    "Советы кондитера:",
    formatList(result.chefTips),
  ]
    .filter(Boolean)
    .join("\n");
}

function formatGroup(title: string, values: string[]) {
  return `${title}: ${values.length > 0 ? values.join(", ") : "не удалось определить"}`;
}

function formatList(values: string[]) {
  return values.length > 0
    ? values.map((value) => `- ${value}`).join("\n")
    : "- не удалось определить";
}
