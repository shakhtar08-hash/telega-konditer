import type { Composer } from "grammy";
import type { PhotoSize } from "grammy/types";
import type { VisionOutput } from "@/ai/schemas/vision";
import type { PastryBotContext } from "../context";

type VisionService = {
  identifyDessert(input: { imageUrl: string }): Promise<VisionOutput>;
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
  dependencies: { botToken: string; visionService: VisionService },
): void {
  composer.on("message:photo", async (ctx) => {
    if (
      ctx.session.lastFeature !== "vision" ||
      ctx.session.lastPromptSlug !== "dessert-identification"
    ) {
      return;
    }

    const photo = getLargestPhoto(ctx.message.photo);

    if (!photo) {
      await ctx.reply("Не получилось прочитать фото. Попробуйте отправить его ещё раз.");
      return;
    }

    await ctx.reply("Анализирую десерт по фото. Это может занять несколько секунд.");

    const file = await ctx.api.getFile(photo.file_id);

    if (!file.file_path) {
      await ctx.reply("Telegram не вернул путь к фото. Попробуйте другое изображение.");
      return;
    }

    const imageUrl = buildTelegramFileUrl(dependencies.botToken, file.file_path);
    const result = await dependencies.visionService.identifyDessert({ imageUrl });

    await ctx.reply(formatVisionResult(result));
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
