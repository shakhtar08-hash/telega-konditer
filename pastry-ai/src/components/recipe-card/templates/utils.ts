import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import { sizeConfig, type CardSize } from "./size-config";
export { sizeConfig };

export function determineCardSize(recipeText: string): CardSize {
  const len = recipeText.length;
  if (len <= 1000) return "compact";
  if (len <= 2500) return "normal";
  return "long";
}

type MetaFields = RecipeCardOutput["meta"];

const metaLabels: Record<string, { icon: string }> = {
  time: { icon: "⏱" },
  difficulty: { icon: "⭐" },
  yield: { icon: "🍪" },
  weight: { icon: "⚖️" },
  storage: { icon: "📦" },
};

export function renderMetaHtml(meta: MetaFields): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(meta)) {
    if (value === null) continue;
    const label = metaLabels[key as keyof typeof metaLabels];
    if (label) {
      parts.push(`<div class="meta-item"><span>${label.icon}</span> ${value}</div>`);
    }
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
        return `<div class="ingredient-section">${item.name}</div>`;
      }
      return `<div class="ingredient-row"><span class="ingredient-name">${item.name}</span><span class="ingredient-amount">${item.amount}</span></div>`;
    })
    .join("");
}

export function renderStepItems(steps: string[]): string {
  return steps
    .map((step) => {
      const sectionMatch = step.match(/^([А-Яа-яA-Za-z]+[^:]*?):\s*(.+)/);
      if (sectionMatch) {
        return `<li class="step-item"><span class="step-section-label">${sectionMatch[1]}:</span> ${sectionMatch[2]}</li>`;
      }
      return `<li class="step-item">${step}</li>`;
    })
    .join("");
}

export function renderTipItems(tips: string[], maxTips: number): string {
  const limited = tips.slice(0, maxTips);
  if (limited.length === 0) return "";
  return limited.map((tip) => `<li class="tip-item">${tip}</li>`).join("");
}

export function sizeCssVars(size: CardSize): string {
  const s = sizeConfig[size];
  return `
:root {
  --card-padding: ${s.padding}px;
  --card-min-height: ${s.minHeight}px;
  --title-size: ${s.titleFontSize}px;
  --body-size: ${s.bodyFontSize}px;
  --step-size: ${s.stepFontSize}px;
  --gap: ${s.gap}px;
  --hero-height: ${s.heroHeight}px;
}`;
}
