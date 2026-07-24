import type { RecipeCardPage } from "@/features/recipe-card/recipe-card-paginator-types";
import type { CardSize } from "./size-config";
import { escapeHtml, renderIngredientRows, renderMetaHtml, renderSectionTitle, renderStepItems, renderTipItems, sizeCssVars } from "./utils";

export function renderDarkHtml(
  page: RecipeCardPage,
  size: CardSize,
): string {
  const isFirstPage = page.pageNumber === 1;
  const showMeta = isFirstPage && page.meta && Object.values(page.meta).some((v) => v !== null && v !== "");
  const metaHtml = showMeta ? renderMetaHtml(page.meta) : "";
  const showHero = page.sections.includes("hero") && !!page.imageUrl;
  const heroHtml = showHero
    ? `<div class="hero-block"><img src="${escapeHtml(page.imageUrl!)}" alt="${escapeHtml(page.title)}" class="hero-img" />${metaHtml}</div>`
    : metaHtml ? `<div class="hero-block">${metaHtml}</div>` : "";
  const showTips = page.sections.includes("tips") && page.tips.length > 0;
  const tipHtml = showTips
    ? `<div class="tips-section">${renderSectionTitle("💡 Советы", page.isTipsContinuation)}<ul>${renderTipItems(page.tips)}</ul></div>`
    : "";
  const footerText = page.totalPages > 1 ? `Карточка ${page.pageNumber}/${page.totalPages}` : "AI Кондитер · рецепт создан с помощью нейросети";
  const hasIngredients = page.sections.includes("ingredients") && page.ingredients.length > 0;
  const hasSteps = page.sections.includes("steps") && page.steps.length > 0;
  const showDescription = isFirstPage && Boolean(page.description);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #0D0D0D; }
.recipe-card { width: 1080px; height: var(--card-height); display: flex; flex-direction: column; background: #1A1A1A; border-radius: 32px; padding: var(--card-padding); gap: var(--gap); border: 1px solid #2A2A2A; }
h1 { font-size: var(--title-size); font-weight: 700; color: #F5F0EB; line-height: 1.15; }
.description { font-size: var(--body-size); color: #A0A0B0; line-height: 1.5; margin-top: 12px; }
.hero-block { background: #222222; border-radius: 28px; padding: 36px; display: flex; flex-direction: column; gap: 20px; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: contain; border-radius: 20px; }
.meta-row { display: flex; gap: 20px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #222222; padding: 10px 18px; border-radius: 12px; font-size: 18px; color: #C8A97E; font-weight: 500; }
.meta-item span { font-size: 20px; }
section { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 32px; font-weight: 600; color: #C8A97E; border-bottom: 1px solid #2A2A2A; padding-bottom: 8px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: var(--step-size); color: #D0D0D0; line-height: 1.5; }
li::marker { color: #C8A97E; }
.ingredient-row { display: flex; justify-content: space-between; font-size: 22px; padding: 8px 0; border-bottom: 1px solid #2A2A2A; }
.ingredient-name { color: #D0D0D0; }
.ingredient-amount { color: #C8A97E; font-weight: 500; }
.ingredient-section { font-size: 20px; font-weight: 700; color: #C8A97E; padding: 12px 0 4px; border-bottom: 1px solid #C8A97E; margin-top: 8px; }
.step-item { font-size: var(--step-size); color: #D0D0D0; padding: 6px 0; }
.step-section-label { font-weight: 700; color: #C8A97E; }
.tips-section { background: #222222; border-radius: 20px; padding: 28px 36px; }
.tip-item { font-size: 20px; color: #D0D0D0; padding: 4px 0; }
.footer { text-align: center; font-size: 16px; color: #555; margin-top: auto; padding-top: 16px; border-top: 1px solid #2A2A2A; }
.section-title { font-size: 32px; font-weight: 600; color: #C8A97E; border-bottom: 1px solid #2A2A2A; padding-bottom: 8px; }
</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${escapeHtml(page.title)}</h1>
${showDescription ? `<p class="description">${escapeHtml(page.description)}</p>` : ""}
</div>
${heroHtml}
${hasIngredients ? `<section>
${renderSectionTitle("Ингредиенты", page.isIngredientsContinuation)}
<div>${renderIngredientRows(page.ingredients)}</div>
</section>` : ""}
${hasSteps ? `<section>
${renderSectionTitle("Приготовление", page.isStepsContinuation)}
<ol>${renderStepItems(page.steps, page.stepStartIndex)}</ol>
</section>` : ""}
${tipHtml}
<div class="footer">${escapeHtml(footerText)}</div>
</div>
</body>
</html>`;
}