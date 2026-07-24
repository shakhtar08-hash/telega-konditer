import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { sizeConfig, type CardSize } from "@/components/recipe-card/templates/size-config";
import type { CardTemplate } from "@/components/recipe-card/templates";
import type { CardPageSection, RecipeCardPage } from "./recipe-card-paginator-types";

export type HeightMeasurer = {
  measureHeight(html: string): Promise<number>;
};

type AtomicItem = {
  type: CardPageSection | "section-title-ingredients" | "section-title-steps" | "section-title-tips";
  text: string;
  stepIndex?: number;
};

function textHeight(text: string, fontSize: number, maxWidth: number): number {
  if (!text) return 0;
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
  const lines = Math.ceil(text.length / Math.max(charsPerLine, 1));
  return lines * fontSize * 1.5;
}

function buildAtomicItems(data: RecipeCardOutput, cfg: typeof sizeConfig.compact): AtomicItem[] {
  const items: AtomicItem[] = [];
  const maxContentWidth = cfg.width - cfg.padding * 2;

  items.push({ type: "header", text: data.title + "\n" + data.description });

  if (data.imageUrl || Object.values(data.meta).some((v) => v !== null && v !== "")) {
    items.push({ type: "hero", text: "" });
  }

  if (data.ingredients.length > 0) {
    items.push({ type: "section-title-ingredients", text: "Ингредиенты" });
    for (const ing of data.ingredients) {
      items.push({ type: "ingredients", text: `${ing.name} ${ing.amount}` });
    }
  }

  if (data.steps.length > 0) {
    items.push({ type: "section-title-steps", text: "Приготовление" });
    for (let i = 0; i < data.steps.length; i++) {
      items.push({ type: "steps", text: data.steps[i], stepIndex: i });
    }
  }

  if (data.tips.length > 0) {
    items.push({ type: "section-title-tips", text: "Советы" });
    for (const tip of data.tips) {
      items.push({ type: "tips", text: tip });
    }
  }

  return items;
}

function estimateItemHeight(cfg: typeof sizeConfig.compact, item: AtomicItem): number {
  const maxContentWidth = cfg.width - cfg.padding * 2;

  switch (item.type) {
    case "header": {
      const parts = item.text.split("\n");
      const titleH = textHeight(parts[0] || "", cfg.titleFontSize, maxContentWidth);
      const descH = textHeight(parts[1] || "", cfg.bodyFontSize, maxContentWidth);
      return titleH + descH + 8 + cfg.gap;
    }
    case "hero":
      return cfg.heroHeight + cfg.gap;
    case "section-title-ingredients":
    case "section-title-steps":
    case "section-title-tips":
      return 40 + cfg.gap;
    case "ingredients":
      return textHeight(item.text, cfg.bodyFontSize, maxContentWidth) + 4 + cfg.gap;
    case "steps":
      return textHeight(item.text, cfg.stepFontSize, maxContentWidth - 50) + 4 + cfg.gap;
    case "tips":
      return textHeight(item.text, cfg.bodyFontSize, maxContentWidth - 50) + 4 + cfg.gap;
    default:
      return 0;
  }
}

type PageDraft = {
  items: AtomicItem[];
  stepOffset: number;
  totalHeight: number;
};

export function createPaginator(_measurer: HeightMeasurer) {
  return {
    async paginate(
      data: RecipeCardOutput,
      _template: CardTemplate,
      imageUrl: string | undefined,
      size: CardSize,
    ): Promise<RecipeCardPage[]> {
      const cfg = sizeConfig[size];
      const allItems = buildAtomicItems(data, cfg);
      if (allItems.length === 0) return [];

      const availableHeight = cfg.height - (cfg.padding * 2 + cfg.footerHeight + cfg.safeBottomSpace);

      // First pass: fill pages sequentially
      const pages: PageDraft[] = [];
      let current: PageDraft = { items: [], stepOffset: 0, totalHeight: 0 };

      for (const item of allItems) {
        const itemHeight = estimateItemHeight(cfg, item);
        const isSectionTitle = item.type.startsWith("section-title-");
        const isFirstOnPage = current.items.length === 0;

        if (isFirstOnPage) {
          current.items.push(item);
          current.totalHeight += itemHeight;
          if (item.type === "steps" && item.stepIndex !== undefined) {
            current.stepOffset = item.stepIndex;
          }
          continue;
        }

        const wouldExceed = current.totalHeight + itemHeight > availableHeight;

        if (wouldExceed) {
          pages.push(current);
          current = { items: [item], stepOffset: 0, totalHeight: itemHeight };
          if (item.type === "steps" && item.stepIndex !== undefined) {
            current.stepOffset = item.stepIndex;
          }
        } else {
          current.items.push(item);
          current.totalHeight += itemHeight;
        }
      }

      if (current.items.length > 0) {
        pages.push(current);
      }

      if (pages.length === 0) return [];

      // Return single page
      if (pages.length === 1) {
        return [buildPage(data, pages[0], 1, 1, imageUrl)];
      }

      // Second pass: balance — if last page <60% full, move items from prev page
      const lastIdx = pages.length - 1;
      const last = pages[lastIdx];
      if (last.totalHeight / availableHeight < 0.6 && lastIdx > 0) {
        const prev = pages[lastIdx - 1];
        for (let i = prev.items.length - 1; i >= 0; i--) {
          const item = prev.items[i];
          // Don't move title/hero/meta items to continuation pages
          if (item.type === "header" || item.type === "hero" || item.type.startsWith("section-title-")) {
            continue;
          }
          const itemHeight = estimateItemHeight(cfg, item);
          if (last.totalHeight + itemHeight <= availableHeight) {
            prev.items.splice(i, 1);
            prev.totalHeight -= itemHeight;
            last.items.unshift(item);
            last.totalHeight += itemHeight;
          } else {
            break;
          }
        }
      }

      // Build final pages
      const result: RecipeCardPage[] = [];
      for (let i = 0; i < pages.length; i++) {
        result.push(buildPage(data, pages[i], i + 1, pages.length, imageUrl));
      }
      return result;
    },
  };
}

function buildPage(
  data: RecipeCardOutput,
  draft: PageDraft,
  pageNumber: number,
  totalPages: number,
  imageUrl: string | undefined,
): RecipeCardPage {
  const isFirst = pageNumber === 1;
  const hasIngredients = draft.items.some((i) => i.type === "ingredients" || i.type === "section-title-ingredients");
  const hasSteps = draft.items.some((i) => i.type === "steps" || i.type === "section-title-steps");
  const hasTips = draft.items.some((i) => i.type === "tips" || i.type === "section-title-tips");
  const hasHero = draft.items.some((i) => i.type === "hero");
  const hasHeader = draft.items.some((i) => i.type === "header");

  const sections: CardPageSection[] = [];
  if (hasHeader) sections.push("header");
  if (hasHero) sections.push("hero");
  if (hasIngredients) sections.push("ingredients");
  if (hasSteps) sections.push("steps");
  if (hasTips) sections.push("tips");

  const steps = draft.items
    .filter((i) => i.type === "steps" && i.stepIndex !== undefined)
    .map((i) => data.steps[i.stepIndex!]);

  return {
    pageNumber,
    totalPages,
    title: data.title,
    description: isFirst ? data.description : "",
    imageUrl: isFirst ? imageUrl : undefined,
    meta: isFirst ? { ...data.meta } : { time: "", yield: "", difficulty: null, storage: null, weight: null },
    ingredients: isFirst ? data.ingredients.filter((_, idx) => {
      if (!hasIngredients) return false;
      const ingSections = draft.items.filter((i) => i.type === "ingredients");
      return ingSections.some((i) => i.text === `${data.ingredients[idx].name} ${data.ingredients[idx].amount}`);
    }) : data.ingredients.filter((_, idx) => {
      if (!hasIngredients) return false;
      const ingSections = draft.items.filter((i) => i.type === "ingredients");
      return ingSections.some((i) => i.text === `${data.ingredients[idx].name} ${data.ingredients[idx].amount}`);
    }),
    steps,
    tips: draft.items
      .filter((i) => i.type === "tips")
      .map((i) => i.text),
    sections,
    isIngredientsContinuation: !isFirst && hasIngredients,
    isStepsContinuation: !isFirst && hasSteps,
    isTipsContinuation: !isFirst && hasTips,
    stepStartIndex: draft.stepOffset + 1,
  };
}