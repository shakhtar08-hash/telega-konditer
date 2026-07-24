import type { RecipeCardPage } from "@/features/recipe-card/recipe-card-paginator-types";
import type { CardTemplate, CardSize } from "./templates";
import { renderMinimalHtml } from "./templates/minimal";
import { renderPinterestHtml } from "./templates/pinterest";
import { renderLuxuryHtml } from "./templates/luxury";
import { renderDarkHtml } from "./templates/dark";

const renderers: Record<CardTemplate, (page: RecipeCardPage, size: CardSize) => string> = {
  minimal: renderMinimalHtml,
  pinterest: renderPinterestHtml,
  luxury: renderLuxuryHtml,
  dark: renderDarkHtml,
};

export function renderRecipeCardHtml(
  page: RecipeCardPage,
  template: CardTemplate = "minimal",
  size?: CardSize,
): string {
  const effectiveSize: CardSize = size ?? "normal";
  return renderers[template](page, effectiveSize);
}