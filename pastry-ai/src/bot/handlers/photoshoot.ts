import { InputFile, type Composer } from "grammy";
import type { PhotoshootOutput } from "@/ai/schemas/photoshoot";
import type { PastryBotContext } from "../context";
import { buildTelegramFileUrl, getLargestPhoto } from "./vision";

type PhotoshootService = {
  generateStyledDessertPhotos(input: {
    imageUrl: string;
  }): Promise<PhotoshootOutput>;
};

export function registerPhotoshootPhotoHandler(
  composer: Composer<PastryBotContext>,
  dependencies: { botToken: string; photoshootService: PhotoshootService },
): void {
  composer.on("message:photo", async (ctx) => {
    if (
      ctx.session.lastFeature !== "photoshoot" ||
      ctx.session.lastPromptSlug !== "product-photo"
    ) {
      return;
    }

    const photo = getLargestPhoto(ctx.message.photo);

    if (!photo) {
      await ctx.reply(
        "Не получилось прочитать фото. Попробуйте отправить его ещё раз.",
      );
      return;
    }

    await ctx.reply(
      "Готовлю 7 вариантов стилизации десерта. Это может занять пару минут.",
    );

    const file = await ctx.api.getFile(photo.file_id);

    if (!file.file_path) {
      await ctx.reply(
        "Telegram не вернул путь к фото. Попробуйте другое изображение.",
      );
      return;
    }

    const imageUrl = buildTelegramFileUrl(dependencies.botToken, file.file_path);
    const result = await dependencies.photoshootService.generateStyledDessertPhotos({
      imageUrl,
    });

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
  return `${current}/${total} — ${styleName}`;
}
