import { describe, expect, it } from "vitest";
import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { createPaginator, type HeightMeasurer } from "./paginator";
import { sizeConfig, type CardSize } from "@/components/recipe-card/templates/size-config";

function makeStubMeasurer(): HeightMeasurer {
  return { measureHeight: async () => 0 };
}

const makeRecipe = (overrides?: Partial<RecipeCardOutput>): RecipeCardOutput => ({
  title: "Тестовый рецепт",
  description: "Простое описание",
  ingredients: [
    { name: "Мука", amount: "200 г" },
    { name: "Сахар", amount: "100 г" },
    { name: "Яйца", amount: "2 шт" },
    { name: "Масло", amount: "50 г" },
    { name: "Молоко", amount: "100 мл" },
  ],
  steps: [
    "Смешать муку с сахаром",
    "Добавить яйца и перемешать",
    "Влить растопленное масло",
    "Добавить молоко, замесить тесто",
    "Выложить в форму",
    "Выпекать 30 минут при 180°C",
    "Остудить и подавать",
    "Посыпать сахарной пудрой",
  ],
  tips: ["Используйте тёплое молоко"],
  meta: { time: "45 мин", yield: "8 шт", difficulty: "Легко", storage: null, weight: null },
  ...overrides,
});

describe("createPaginator", () => {
  it("returns 1-2 pages for short recipes on compact", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({ steps: ["Step 1", "Step 2", "Step 3"] });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    // Short recipe with 5 ingredients + 3 steps + hero + meta + tips
    // may fit on 1 page or split to 2 on compact (1350px)
    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(pages.length).toBeLessThanOrEqual(2);
    expect(pages[0].pageNumber).toBe(1);
  });

  it("returns a single page for short recipe in normal size", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({ steps: ["Step 1", "Step 2", "Step 3"] });
    const pages = await paginator.paginate(data, "minimal", undefined, "normal");
    expect(pages.length).toBe(1);
    expect(pages[0].totalPages).toBe(1);
  });

  it("produces multiple pages for a long recipe with many steps", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      steps: Array.from({ length: 25 }, (_, i) => `Step ${i + 1} with enough text to make it wrap across multiple lines of content for testing purposes`),
    });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    expect(pages.length).toBeGreaterThan(1);
  });

  it("preserves all ingredients across pages", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      ingredients: Array.from({ length: 20 }, (_, i) => ({ name: `Ингредиент ${i + 1}`, amount: `${i + 1} г` })),
      steps: Array.from({ length: 15 }, (_, i) => `Step ${i + 1}`),
    });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    const allNames = pages.flatMap((p) => p.ingredients.map((i) => i.name));
    expect(allNames.length).toBe(20);
  });

  it("preserves all tips across pages", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      tips: ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5", "Tip 6"],
      steps: Array.from({ length: 15 }, (_, i) => `Step ${i + 1}`),
    });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    const allTips = pages.flatMap((p) => p.tips);
    expect(allTips.length).toBe(6);
  });

  it("continues step numbering across pages", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      steps: Array.from({ length: 15 }, (_, i) => `Step ${i + 1} with enough text to wrap across multiple lines`),
    });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    if (pages.length > 1) {
      const expectedStart = pages[0].steps.length + 1;
      expect(pages[1].stepStartIndex).toBe(expectedStart);
    }
  });

  it("includes hero image only on first page", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      steps: Array.from({ length: 20 }, (_, i) => `Step ${i + 1} with enough text to wrap across multiple lines`),
    });
    const pages = await paginator.paginate(data, "minimal", "https://img.test/cake.png", "compact");
    expect(pages[0].sections).toContain("hero");
    if (pages.length > 1) {
      expect(pages[1].imageUrl).toBeUndefined();
    }
  });

  it("has empty description on continuation pages", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      steps: Array.from({ length: 20 }, (_, i) => `Step ${i + 1} with enough text to wrap across multiple lines`),
    });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    if (pages.length > 1) {
      expect(pages[0].description).toBeTruthy();
      expect(pages[1].description).toBe("");
    }
  });

  it("has empty meta on continuation pages", async () => {
    const paginator = createPaginator(makeStubMeasurer());
    const data = makeRecipe({
      steps: Array.from({ length: 20 }, (_, i) => `Step ${i + 1} with enough text to wrap across multiple lines`),
    });
    const pages = await paginator.paginate(data, "minimal", undefined, "compact");
    if (pages.length > 1) {
      expect(pages[0].meta.time).toBeTruthy();
      expect(pages[1].meta.time).toBe("");
    }
  });
});