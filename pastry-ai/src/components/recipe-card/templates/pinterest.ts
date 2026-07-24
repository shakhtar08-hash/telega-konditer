import type { RecipeCardPage } from "@/features/recipe-card/recipe-card-paginator-types";
import type { CardSize } from "./size-config";
import { escapeHtml, renderIngredientRows, renderMetaHtml, renderSectionTitle, renderStepItems, renderTipItems, sizeCssVars } from "./utils";

export function renderPinterestHtml(
  page: RecipeCardPage,
  size: CardSize,
): string {
  const isFirstPage = page.pageNumber === 1;
  const showMeta = isFirstPage && page.meta && Object.values(page.meta).some((v) => v !== null && v !== "");
  const metaHtml = showMeta ? renderMetaHtml(page.meta) : "";
  const showHero = page.sections.includes("hero") && !!page.imageUrl;
  const heroHtml = showHero
    ? `<div class="hero-area"><img src="${escapeHtml(page.imageUrl!)}" alt="${escapeHtml(page.title)}" class="hero-img" /><div class="hero-overlay"></div></div>`
    : "";
  const showTips = page.sections.includes("tips") && page.tips.length > 0;
  const tipHtml = showTips
    ? `<section>${renderSectionTitle("💡 Советы", page.isTipsContinuation)}<ul>${renderTipItems(page.tips)}</ul></section>`
    : "";
  const footerText = page.totalPages > 1 ? `Карточка ${page.pageNumber}/${page.totalPages}` : "AI Кондитер · рецепт создан с помощью нейросети";
  const hasIngredients = page.sections.includes("ingredients") && page.ingredients.length > 0;
  const hasSteps = page.sections.includes("steps") && page.steps.length > 0;
  const showDescription = isFirstPage && Boolean(page.description);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #F0EBE3; }
.recipe-card { width: 1080px; height: var(--card-height); display: flex; flex-direction: column; background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.06); }
.hero-area { height: var(--hero-height); background: linear-gradient(135deg, #E8DFD0 0%, #D6C9B3 100%); position: relative; overflow: hidden; }
.hero-img { width: 100%; height: 100%; object-fit: contain; }
.hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(transparent, rgba(0,0,0,0.15)); }
.card-content { padding: var(--card-padding); display: flex; flex-direction: column; gap: var(--gap); }
h1 { font-size: var(--title-size); font-weight: 700; color: #1A1A2E; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8A8A9E; line-height: 1.5; margin-top: 12px; }
.meta-row { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #F5F2ED; padding: 10px 18px; border-radius: 12px; font-size: 18px; color: #1A1A2E; font-weight: 500; }
.meta-item span { font-size: 20px; }
section { display: flex; flex-direction: column; gap: 16px; }
h2 { font-size: 30px; font-weight: 600; color: #1A1A2E; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 22px; color: #2D2D44; line-height: 1.5; }
.ingredient-row { display: flex; justify-content: space-between; font-size: 22px; padding: 6px 0; }
.ingredient-name { color: #2D2D44; }
.ingredient-amount { color: #8B7355; font-weight: 500; }
.ingredient-section { font-size: 20px; font-weight: 700; color: #1A1A2E; padding: 10px 0 4px; border-bottom: 2px solid #C8A97E; margin-top: 6px; }
.step-item { font-size: var(--step-size); color: #2D2D44; padding: 4px 0; border-bottom: 1px solid #F0EBE3; }
.step-section-label { font-weight: 700; color: #1A1A2E; }
.footer { text-align: center; font-size: 16px; color: #A09DB0; margin-top: auto; padding-top: 16px; }
.section-title { font-size: 30px; font-weight: 600; color: #1A1A2E; }
</style>
</head>
<body>
<div class="recipe-card">
${heroHtml}
<div class="card-content">
<h1>${escapeHtml(page.title)}</h1>
${showDescription ? `<p class="description">${escapeHtml(page.description)}</p>` : ""}
${metaHtml}
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
</div>
</body>
</html>`;
}