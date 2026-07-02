import { InputFile } from "grammy";
import { describe, expect, it } from "vitest";
import {
  formatPhotoshootCaption,
  toTelegramPhotoInput,
} from "./photoshoot";

describe("photoshoot bot handler helpers", () => {
  it("keeps external image URLs as Telegram photo URLs", () => {
    expect(toTelegramPhotoInput("https://example.com/style.png", "style.png")).toBe(
      "https://example.com/style.png",
    );
  });

  it("converts data URLs to Telegram InputFile objects", () => {
    const input = toTelegramPhotoInput(
      "data:image/png;base64,aGVsbG8=",
      "style.png",
    );

    expect(input).toBeInstanceOf(InputFile);
  });

  it("formats style captions for generated dessert photos", () => {
    expect(formatPhotoshootCaption(3, 7, "Тёмный премиум")).toBe(
      "3/7 — Тёмный премиум",
    );
  });
});
