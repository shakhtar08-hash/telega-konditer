import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { sizeConfig, type CardSize } from "./size-config";

export { sizeConfig };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderSectionTitle(title: string, isContinuation?: boolean): string {
  const text = isContinuation ? `${escapeHtml(title)} (продолжение)` : escapeHtml(title);
  return `<div class="section-title">${text}</div>`;
}

export function determineCardSize(recipeText: string): CardSize {
  const len = recipeText.length;
  if (len <= 1000) return "compact";
  return "normal";
}

export function determineCardSizeFromData(data: RecipeCardOutput): CardSize {
  let units = 0;
  units += data.ingredients.length * 3;
  units += data.steps.length * 2;
  units += data.tips.length * 2;
  if (data.description) units += 2;
  if (Object.values(data.meta).some(v => v !== null && v !== '')) units += 1;
  return units <= 60 ? "compact" : "normal";
}

type MetaFields = RecipeCardOutput["meta"];

const metaLabels: Record<keyof MetaFields, { icon: string }> = {
  time: { icon: "&#x23F1;&#xFE0F;" },
  difficulty: { icon: "&#x2B50;" },
  yield: { icon: "&#x1F36A;" },
  weight: { icon: "&#x2696;&#xFE0F;" },
  storage: { icon: "&#x1F4E6;" },
};

export function renderMetaHtml(meta: MetaFields): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(meta) as Array<[keyof MetaFields, MetaFields[keyof MetaFields]]>) {
    if (value === null) continue;

    const text = value.trim();
    if (!text) continue;

    const label = metaLabels[key];
    parts.push(`<div class="meta-item"><span>${label.icon}</span> ${escapeHtml(text)}</div>`);
  }

  if (parts.length === 0) return "";
  return `<div class="meta-row">${parts.join("")}</div>`;
}

export function isSectionHeading(name: string, amount: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || amount.trim()) return false;
  return trimmed.length < 40 && !/\d/.test(trimmed);
}

export function renderIngredientRows(ingredients: RecipeCardOutput["ingredients"]): string {
  return ingredients
    .map((item) => {
      if (isSectionHeading(item.name, item.amount)) {
        return `<div class="ingredient-section">${escapeHtml(item.name)}</div>`;
      }

      return `<div class="ingredient-row"><span class="ingredient-name">${escapeHtml(item.name)}</span><span class="ingredient-amount">${escapeHtml(item.amount)}</span></div>`;
    })
    .join("");
}

export function renderStepItems(steps: string[], startIndex?: number): string {
  return steps
    .map((step, i) => {
      const stepNumber = startIndex !== undefined ? startIndex + i + 1 : i + 1;
      const sectionMatch = step.match(/^([А-Яа-яA-Za-z]+[^:]*?):\s*(.+)/);
      if (sectionMatch) {
        return `<li class="step-item"><span class="step-number">${stepNumber}.</span> <span class="step-section-label">${escapeHtml(sectionMatch[1])}:</span> ${escapeHtml(sectionMatch[2])}</li>`;
      }

      return `<li class="step-item"><span class="step-number">${stepNumber}.</span> ${escapeHtml(step)}</li>`;
    })
    .join("");
}

export function renderTipItems(tips: string[]): string {
  if (tips.length === 0) return "";
  return tips.map((tip) => `<li class="tip-item">${escapeHtml(tip)}</li>`).join("");
}

export function sizeCssVars(size: CardSize): string {
  const s = sizeConfig[size];
  return `
:root {
  --card-padding: ${s.padding}px;
  --card-height: ${s.height}px;
  --title-size: ${s.titleFontSize}px;
  --cont-title-size: ${s.continuationTitleFontSize}px;
  --body-size: ${s.bodyFontSize}px;
  --step-size: ${s.stepFontSize}px;
  --gap: ${s.gap}px;
  --hero-height: ${s.heroHeight}px;
  --footer-height: ${s.footerHeight}px;
}`;
}
