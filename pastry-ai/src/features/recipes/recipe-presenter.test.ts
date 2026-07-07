import { describe, expect, it } from "vitest";
import {
  buildRecipeImagePrompt,
  formatRecipeOutputForTelegram,
  type StructuredRecipeOutput,
} from "./recipe-presenter";

const recipeOutput: StructuredRecipeOutput = {
  recipes: [
    {
      name: "Шоколадный бисквит",
      whyFits: "Практически все ингредиенты уже есть у пользователя.",
      ingredients: [
        "Шоколад - 120 г",
        "Мука - 140 г",
        "Яйца - 3 шт.",
        "Сахар - 160 г",
      ],
      steps: [
        "Разогрейте духовку до 175°C и подготовьте форму диаметром 18 см.",
        "Растопите шоколад и слегка остудите, чтобы он не свернул яйца.",
        "Взбейте яйца с сахаром до светлой пышной массы.",
        "Аккуратно вмешайте шоколад, затем просеянную муку и разрыхлитель.",
      ],
      activeTime: "25 минут",
      chillingTime: "Без охлаждения",
      totalTime: "55 минут",
      difficulty: "easy",
      pastryTip: "Не пересушивайте бисквит: проверяйте готовность уже с 28-й минуты.",
      imagePrompt:
        "Luxury pastry photography of a tall chocolate sponge cake with glossy chocolate glaze, a neat slice removed to show the soft dark crumb, elegant white ceramic plate, premium patisserie styling, natural light, soft shadows, shallow depth of field, ultra realistic.",
    },
  ],
};

describe("recipe presenter", () => {
  it("formats structured recipe output into full Telegram text", () => {
    const text = formatRecipeOutputForTelegram(recipeOutput);

    expect(text).toContain("Нашел 1 подходящий вариант.");
    expect(text).toContain("1. Название");
    expect(text).toContain("Шоколадный бисквит");
    expect(text).toContain("2. Почему подходит");
    expect(text).toContain("3. Ингредиенты");
    expect(text).toContain("4. Полная технология приготовления");
    expect(text).toContain("5. Время приготовления");
    expect(text).toContain("6. Сложность");
    expect(text).toContain("🟢 Легко");
    expect(text).toContain("7. Совет кондитера");
    expect(text).not.toContain("Image Prompt");
  });

  it("keeps image prompts out of user text and available for image generation", () => {
    const prompt = buildRecipeImagePrompt(recipeOutput.recipes[0]);

    expect(prompt).toContain("Luxury pastry photography");
    expect(prompt).toContain("chocolate sponge cake");
  });
});
