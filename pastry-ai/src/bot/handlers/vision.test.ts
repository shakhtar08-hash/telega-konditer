import { describe, expect, it } from "vitest";
import {
  buildTelegramFileUrl,
  formatVisionResult,
  getLargestPhoto,
} from "./vision";

describe("vision bot handler helpers", () => {
  it("selects the largest Telegram photo variant", () => {
    expect(
      getLargestPhoto([
        { file_id: "small", file_unique_id: "s", width: 90, height: 90 },
        { file_id: "large", file_unique_id: "l", width: 1280, height: 960 },
        { file_id: "medium", file_unique_id: "m", width: 640, height: 640 },
      ])?.file_id,
    ).toBe("large");
  });

  it("builds a Telegram file URL from bot token and file path", () => {
    expect(buildTelegramFileUrl("123:token", "photos/file.jpg")).toBe(
      "https://api.telegram.org/file/bot123:token/photos/file.jpg",
    );
  });

  it("formats a structured dessert analysis for Telegram", () => {
    const text = formatVisionResult({
      chefTips: ["Наносите велюр на замороженное изделие."],
      composition: {
        base: ["миндальный дакуаз"],
        coating: ["велюр"],
        cream: ["мусс из белого шоколада"],
        decor: ["шоколадный декор"],
        filling: ["манго-маракуйя"],
      },
      confidence: {
        level: "medium",
        reason: "Разрез не виден, начинка определена предположительно.",
      },
      difficulty: {
        level: "professional",
        reason: "Нужны силиконовая форма и краскопульт.",
      },
      fillingHypotheses: ["манго-маракуйя", "лимонный курд"],
      recipeIdea: {
        ingredients: ["сливки 33%", "белый шоколад", "желатин"],
        method: ["Приготовить мусс", "Собрать десерт", "Покрыть велюром"],
        title: "Муссовое пирожное с манго",
      },
      similarDesserts: ["муссовое пирожное", "мини-энтреме"],
      summary: "Похоже на современное муссовое пирожное.",
      techniques: ["муссовая технология", "велюровое покрытие"],
    });

    expect(text).toContain("Похоже на современное муссовое пирожное.");
    expect(text).toContain("Уверенность: средняя");
    expect(text).toContain("манго-маракуйя");
    expect(text).toContain("Муссовое пирожное с манго");
    expect(text).toContain("Советы кондитера");
  });
});
