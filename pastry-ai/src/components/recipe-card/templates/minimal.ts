import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { sizeCssVars, renderMetaHtml, renderIngredientRows, renderStepItems, renderTipItems, sizeConfig } from "./utils";

export function renderMinimalHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
): string {
  const cfg = sizeConfig[size];
  const meta = renderMetaHtml(data.meta);
  const heroHtml = imageUrl
    ? `<div class="hero-block"><img src="${imageUrl}" alt="${data.title}" class="hero-img" />${meta}</div>`
    : meta ? `<div class="hero-block">${meta}</div>` : "";
  const tipHtml = data.tips.length > 0
    ? `<div class="tips-section"><h2>💡 Советы</h2><ul>${renderTipItems(data.tips, cfg.maxTips)}</ul></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #FCFBF8; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: white; border-radius: 40px; padding: var(--card-padding); gap: var(--gap); box-shadow: 0 20px 60px rgba(0,0,0,0.04); }
h1 { font-size: var(--title-size); font-weight: 700; color: #1a1a2e; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8a8a9e; line-height: 1.5; margin-top: -12px; }
.hero-block { background: #F8F6F3; border-radius: 32px; padding: 40px; display: flex; flex-direction: column; gap: 24px; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: contain; border-radius: 24px; }
.meta-row { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; background: #F8F6F3; padding: 12px 20px; border-radius: 14px; font-size: 20px; color: #1a1a2e; font-weight: 500; }
.meta-item span { font-size: 22px; }
section { display: flex; flex-direction: column; gap: 18px; }
h2 { font-size: 34px; font-weight: 600; color: #1a1a2e; border-bottom: 2px solid #E8DFD0; padding-bottom: 10px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: 24px; color: #2d2d44; line-height: 1.5; }
li::marker { color: #C8A97E; }
.ingredient-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 24px; padding: 8px 0; border-bottom: 1px solid #F0EBE3; }
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #8B7355; font-weight: 500; white-space: nowrap; margin-left: 16px; }
.ingredient-section { font-size: 22px; font-weight: 700; color: #1a1a2e; padding: 12px 0 4px; border-bottom: 2px solid #C8A97E; margin-top: 8px; }
.step-item { font-size: var(--step-size); color: #2d2d44; padding: 6px 0; }
.step-section-label { font-weight: 700; color: #1a1a2e; }
.tips-section { background: #F8F6F3; border-radius: 20px; padding: 28px 36px; }
.tip-item { font-size: 22px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 18px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #F0EBE3; }
</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${data.title}</h1>
${data.description ? `<p class="description">${data.description}</p>` : ""}
</div>
${heroHtml}
<section>
<h2>Ингредиенты</h2>
<div>${renderIngredientRows(data.ingredients)}</div>
</section>
<section>
<h2>Приготовление</h2>
<ol>${renderStepItems(data.steps)}</ol>
</section>
${tipHtml}
<div class="footer">AI Кондитер · рецепт создан с помощью нейросети</div>
</div>
</body>
</html>`;
}