import type { RecipeCardPage } from "@/features/recipe-card/recipe-card-paginator-types";
import type { CardSize } from "./size-config";
import { sizeConfig, escapeHtml, renderIngredientRows, renderMetaHtml, renderSectionTitle, renderStepItems, renderTipItems, sizeCssVars } from "./utils";

export function renderMinimalHtml(
  page: RecipeCardPage,
  size: CardSize,
): string {
  const cfg = sizeConfig[size];
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
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #FCFBF8; }
.recipe-card { width: 1080px; height: var(--card-height); display: flex; flex-direction: column; background: white; border-radius: 40px; padding: var(--card-padding); gap: var(--gap); box-shadow: 0 20px 60px rgba(0,0,0,0.04); }
h1 { font-size: var(--title-size); font-weight: 700; color: #1A1A2E; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8A8A9E; line-height: 1.5; margin-top: 12px; }
.hero-block { background: #F8F6F3; border-radius: 32px; padding: 40px; display: flex; flex-direction: column; gap: 24px; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: contain; border-radius: 24px; }
.meta-row { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #F8F6F3; padding: 12px 20px; border-radius: 14px; font-size: 20px; color: #1A1A2E; font-weight: 500; }
.meta-item span { font-size: 22px; }
section { display: flex; flex-direction: column; gap: 18px; }
h2 { font-size: 34px; font-weight: 600; color: #1A1A2E; border-bottom: 2px solid #E8DFD0; padding-bottom: 10px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 24px; color: #2D2D44; line-height: 1.5; }
li::marker { color: #C8A97E; }
.ingredient-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 24px; padding: 8px 0; border-bottom: 1px solid #F0EBE3; }
.ingredient-name { color: #2D2D44; }
.ingredient-amount { color: #8B7355; font-weight: 500; white-space: nowrap; margin-left: 16px; }
.ingredient-section { font-size: 22px; font-weight: 700; color: #1A1A2E; padding: 12px 0 4px; border-bottom: 2px solid #C8A97E; margin-top: 8px; }
.step-item { font-size: var(--step-size); color: #2D2D44; padding: 6px 0; }
.step-section-label { font-weight: 700; color: #1A1A2E; }
.tips-section { background: #F8F6F3; border-radius: 20px; padding: 28px 36px; }
.tip-item { font-size: 22px; color: #2D2D44; padding: 4px 0; }
.footer { text-align: center; font-size: 18px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #F0EBE3; }
.section-title { font-size: 34px; font-weight: 600; color: #1A1A2E; border-bottom: 2px solid #E8DFD0; padding-bottom: 10px; }
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