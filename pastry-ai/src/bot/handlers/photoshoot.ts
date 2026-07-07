import { InputFile, type Composer } from "grammy";
import type { PhotoshootOutput } from "@/ai/schemas/photoshoot";
import { prisma } from "@/db/prisma";
import { UserFacingError } from "@/lib/user-facing-error";
import type { PastryBotContext } from "../context";
import { resolveUserIdByTelegramId } from "../user-id";
import { buildTelegramFileUrl, getLargestPhoto } from "./vision";

type TokenGuardService = {
  ensureSufficientTokens(userId: string, required: number): Promise<void>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};

type PhotoshootService = {
  generateStyledDessertPhotos(input: {
    imageUrl: string;
  }): Promise<PhotoshootOutput>;
};

const readPhotoErrorMessage =
  "Не получилось прочитать фото. Попробуйте отправить его ещё раз.";
const processingMessage =
  "Готовлю 7 вариантов стилизации десерта. Это может занять пару минут.";
const missingTelegramFilePathMessage =
  "Telegram не вернул путь к фото. Попробуйте другое изображение.";

const missingProfileMessage =
  "Не удалось найти ваш профиль в базе. Нажмите /start и попробуйте ещё раз.";

export function registerPhotoshootPhotoHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    botToken: string;
    photoshootService: PhotoshootService;
    tokenGuard: TokenGuardService;
  },
): void {
  composer.on("message:photo", async (ctx, next) => {
    if (
      ctx.session.lastFeature !== "photoshoot" ||
      ctx.session.lastPromptSlug !== "product-photo"
    ) {
      return next();
    }

    const photo = getLargestPhoto(ctx.message.photo);

    if (!photo) {
      await ctx.reply(readPhotoErrorMessage);
      return;
    }

    await ctx.reply(processingMessage);

    const file = await ctx.api.getFile(photo.file_id);

    if (!file.file_path) {
      await ctx.reply(missingTelegramFilePathMessage);
      return;
    }

    const imageUrl = buildTelegramFileUrl(dependencies.botToken, file.file_path);

    const userId = await resolveUserIdByTelegramId(
      prisma.user,
      String(ctx.from?.id ?? ""),
    );

    if (!userId) {
      await ctx.reply(missingProfileMessage);
      return;
    }

    const styleCount = await prisma.photoStyle.count({ where: { active: true } });
    if (styleCount > 0) {
      try {
        await dependencies.tokenGuard.ensureSufficientTokens(userId, styleCount);
      } catch (error) {
        if (error instanceof UserFacingError) {
          await ctx.reply(error.message);
          return;
        }
        throw error;
      }
    }

    let result: PhotoshootOutput;

    try {
      result = await dependencies.photoshootService.generateStyledDessertPhotos({
        imageUrl,
      });
    } catch (error) {
      const configurationError = getPhotoshootConfigurationErrorMessage(error);

      if (configurationError) {
        await ctx.reply(configurationError);
        return;
      }

      throw error;
    }

    for (const [index, image] of result.images.entries()) {
      await ctx.replyWithPhoto(
        toTelegramPhotoInput(image.imageUrl, `${image.styleId}.png`),
        {
          caption: formatPhotoshootCaption(
            index + 1,
            result.images.length,
            image.styleName,
          ),
        },
      );
      await dependencies.tokenGuard.chargeTokens(
        userId,
        "photoshoot",
        "product-photo",
        1,
      );
    }
  });
}

export function toTelegramPhotoInput(imageUrl: string, filename: string) {
  if (!imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid generated image data URL");
  }

  return new InputFile(Buffer.from(match[2], "base64"), filename);
}

export function formatPhotoshootCaption(
  current: number,
  total: number,
  styleName: string,
) {
  return `${current}/${total} - ${styleName}`;
}

export function getPhotoshootConfigurationErrorMessage(error: unknown) {
  if (
    error instanceof UserFacingError &&
    error.message.includes("OpenAI") &&
    error.message.includes("gpt-image-1")
  ) {
    return `${error.message} Верните в админке provider = OpenAI и model = gpt-image-1.`;
  }

  return null;
}
