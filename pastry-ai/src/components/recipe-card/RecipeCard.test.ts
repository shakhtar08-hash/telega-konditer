import { describe, expect, it } from "vitest";
import type { RecipeCardPage } from "@/features/recipe-card/recipe-card-paginator-types";
import type { CardTemplate } from "./templates";
import { renderRecipeCardHtml } from "./RecipeCard";

const makePage = (overrides?: Partial<RecipeCardPage>): RecipeCardPage => ({
  pageNumber: 1,
  totalPages: 1,
  title: "Тестовый рецепт",
  description: "Описание",
  imageUrl: "https://img.test/cake.png",
  meta: { time: "30 мин", yield: "6 шт", difficulty: null, storage: null, weight: null },
  ingredients: [{ name: "Мука", amount: "200 г" }],
  steps: ["Шаг 1", "Шаг 2"],
  tips: ["Совет 1"],
  sections: ["header", "hero", "ingredients", "steps", "tips"],
  isIngredientsContinuation: false,
  isStepsContinuation: false,
  isTipsContinuation: false,
  stepStartIndex: 1,
  ...overrides,
});

const templates: CardTemplate[] = ["minimal", "pinterest", "luxury", "dark"];

describe("renderRecipeCardHtml", () => {
  it.each(templates)("uses fixed height CSS for %s", (template) => {
    const page = makePage();
    const html = renderRecipeCardHtml(page, template);
    expect(html).toContain("height: var(--card-height)");
    expect(html).not.toContain("min-height");
  });

  it.each(templates)("hides hero on continuation pages for %s", (template) => {
    const page = makePage({ pageNumber: 2, totalPages: 2, imageUrl: "https://img.test/cake.png", sections: ["header", "ingredients", "steps"] });
    const html = renderRecipeCardHtml(page, template);
    expect(html).not.toContain("cake.png");
  });

  it.each(templates)("shows continuation title for %s", (template) => {
    const page = makePage({ pageNumber: 2, totalPages: 2, isStepsContinuation: true, stepStartIndex: 5 });
    const html = renderRecipeCardHtml(page, template);
    expect(html).toContain("продолжение");
  });

  it("dark template includes description and tips", () => {
    const page = makePage();
    const html = renderRecipeCardHtml(page, "dark");
    expect(html).toContain("Описание");
    expect(html).toContain("Совет 1");
  });

  it("pinterest template includes tips", () => {
    const page = makePage();
    const html = renderRecipeCardHtml(page, "pinterest");
    expect(html).toContain("Совет 1");
  });
});