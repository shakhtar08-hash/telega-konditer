import { type Composer } from "grammy";
import type { PhotoshootOutput } from "@/ai/schemas/photoshoot";
import { prisma } from "@/db/prisma";
import { UserFacingError } from "@/lib/user-facing-error";
import type { PastryBotContext } from "../context";
import { resolveUserIdByTelegramId } from "../user-id";
import { buildTelegramFileUrl, getLargestPhoto } from "./vision";
import { toTelegramPhotoInput } from "./photoshoot";

type TokenGuardService = {
  ensureSufficientTokens(userId: string, required: number): Promise<void>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};

type PhotoshootService = {
  generateStyledDessertPhoto(input: {
    imageUrl: string;
    styleId: string;
  }): Promise<PhotoshootOutput>;
};

const missingProfileMessage =
  "Не удалось найти ваш профиль в базе. Нажмите /start и попробуйте ещё раз.";

export function registerSingleStylePhotoshootHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    botToken: string;
    photoshootService: PhotoshootService;
    tokenGuard: TokenGuardService;
    conversationLogService?: {
      startConversation(input: { userId: string; feature: string }): Promise<string>;
      appendUserMessage(input: { conversationId: string; content: string; caption?: string }): Promise<void>;
      appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
      appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
    };
  },
): void {
  composer.on("message:photo", async (ctx, next) => {
    if (ctx.session.lastFeature !== "photoshoot-single-style") {
      return next();
    }

    const styleId = ctx.session.selectedStyleId;

    if (!styleId) {
      await ctx.reply(
        "Не выбран стиль. Нажмите /menu и выберите стиль заново.",
      );
      return;
    }

    const photo = getLargestPhoto(ctx.message.photo);

    if (!photo) {
      await ctx.reply(
        "Не получилось прочитать фото. Попробуйте отправить его ещё раз.",
      );
      return;
    }

    await ctx.reply("Готовлю фото в выбранном стиле. Это может занять до минуты.");

    const file = await ctx.api.getFile(photo.file_id);

    if (!file.file_path) {
      await ctx.reply(
        "Telegram не вернул путь к фото. Попробуйте другое изображение.",
      );
      return;
    }

    const imageUrl = buildTelegramFileUrl(
      dependencies.botToken,
      file.file_path,
    );

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.reply(missingProfileMessage);
      return;
    }

    try {
      await dependencies.tokenGuard.ensureSufficientTokens(userId, 1);
    } catch (error) {
      if (error instanceof UserFacingError) {
        await ctx.reply(error.message);
        return;
      }
      throw error;
    }

    let result: PhotoshootOutput;

    try {
      result =
        await dependencies.photoshootService.generateStyledDessertPhoto({
          imageUrl,
          styleId,
        });
    } catch (error) {
      if (error instanceof UserFacingError) {
        await ctx.reply(error.message);
        return;
      }

      throw error;
    }

    for (const [index, image] of result.images.entries()) {
      await ctx.replyWithPhoto(
        toTelegramPhotoInput(image.imageUrl, `${image.styleId}.png`),
        {
          caption: `${index + 1}/${result.images.length} - ${image.styleName}`,
        },
      );
      await dependencies.tokenGuard.chargeTokens(
        userId,
        "photoshoot",
        styleId,
        1,
      );
    }
  });
}
