import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardTemplate, CardSize } from "./templates";
import { renderMinimalHtml } from "./templates/minimal";
import { renderPinterestHtml } from "./templates/pinterest";
import { renderLuxuryHtml } from "./templates/luxury";
import { renderDarkHtml } from "./templates/dark";
import { determineCardSize } from "./templates";

const renderers: Record<CardTemplate, typeof renderMinimalHtml> = {
  minimal: renderMinimalHtml,
  pinterest: renderPinterestHtml,
  luxury: renderLuxuryHtml,
  dark: renderDarkHtml,
};

function isContinuationPage(pageLabel?: string): boolean {
  if (!pageLabel) return false;
  return !/1\/\d+\s*$/.test(pageLabel);
}

export function renderRecipeCardHtml(
  data: RecipeCardOutput,
  template: CardTemplate = "minimal",
  imageUrl?: string,
  size?: CardSize,
  pageLabel?: string,
): string {
  const effectiveSize: CardSize = size ?? determineCardSize(
    [data.title, data.description, ...data.ingredients.map((i) => `${i.name} ${i.amount}`), ...data.steps, ...data.tips].join(" "),
  );
  const effectiveImageUrl = isContinuationPage(pageLabel) ? undefined : imageUrl;
  return renderers[template](data, effectiveImageUrl, effectiveSize, pageLabel);
}
