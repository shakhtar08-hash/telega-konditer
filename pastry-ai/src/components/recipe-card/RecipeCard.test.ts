import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { describe, expect, it } from "vitest";
import { renderRecipeCardHtml } from "./RecipeCard";
import type { CardTemplate } from "./templates";

const continuationData: RecipeCardOutput = {
  title: "Шоколадный лимонный торт",
  description: "",
  ingredients: [],
  steps: ["Разогреть духовку", "Смешать ингредиенты"],
  tips: ["Используйте свежевыжатый сок"],
  meta: {
    time: "",
    yield: "",
    difficulty: null,
    storage: null,
    weight: null,
  },
};

const templates: CardTemplate[] = ["minimal", "pinterest", "luxury", "dark"];

describe("renderRecipeCardHtml", () => {
  it.each(templates)("hides hero media and empty meta on continuation card for %s", (template) => {
    const html = renderRecipeCardHtml(
      continuationData,
      template,
      "https://img.test/cake.png",
      "normal",
      "Карточка 2/2",
    );

    expect(html).toContain("Приготовление");
    expect(html).not.toContain(`<img src="https://img.test/cake.png"`);
    expect(html).not.toContain('<div class="meta-row">');
    expect(html).not.toContain("https://img.test/cake.png");
  });
});
