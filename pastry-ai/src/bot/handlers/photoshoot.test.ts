import { InputFile } from "grammy";
import { describe, expect, it } from "vitest";
import { UserFacingError } from "@/lib/user-facing-error";
import {
  formatPhotoshootCaption,
  getPhotoshootConfigurationErrorMessage,
  toTelegramPhotoInput,
} from "./photoshoot";

describe("photoshoot bot handler helpers", () => {
  it("keeps external image URLs as Telegram photo URLs", () => {
    expect(
      toTelegramPhotoInput("https://example.com/style.png", "style.png"),
    ).toBe("https://example.com/style.png");
  });

  it("converts data URLs to Telegram InputFile objects", () => {
    const input = toTelegramPhotoInput(
      "data:image/png;base64,aGVsbG8=",
      "style.png",
    );

    expect(input).toBeInstanceOf(InputFile);
  });

  it("formats style captions for generated dessert photos", () => {
    expect(formatPhotoshootCaption(3, 7, "Темный премиум")).toBe(
      "3/7 - Темный премиум",
    );
  });

  it("recognizes photoshoot provider misconfiguration errors", () => {
    expect(
      getPhotoshootConfigurationErrorMessage(
        new UserFacingError(
          'Сценарий "Создать фото" сейчас работает только через OpenAI с моделью gpt-image-1.',
        ),
      ),
    ).toBe(
      'Сценарий "Создать фото" сейчас работает только через OpenAI с моделью gpt-image-1. Верните в админке provider = OpenAI и model = gpt-image-1.',
    );
  });
});
