import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { sizeCssVars, renderMetaHtml, renderIngredientRows, renderStepItems, renderTipItems, sizeConfig } from "./utils";

export function renderLuxuryHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
  pageLabel?: string,
): string {
  const cfg = sizeConfig[size];
  const footerText = pageLabel ?? "AI Кондитер · рецепт создан с помощью нейросети";
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #F8F5F0; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: #FDFCFA; border-radius: 32px; padding: var(--card-padding); gap: var(--gap); border: 1px solid #E8DFD0; box-shadow: 0 20px 80px rgba(0,0,0,0.03); }
h1 { font-family: 'Playfair Display', serif; font-size: var(--title-size); font-weight: 700; color: #1a1a2e; line-height: 1.15; }
.description { font-size: var(--body-size); color: #8a8a9e; font-style: italic; line-height: 1.5; }
.hero-block { background: #F8F5F0; border-radius: 28px; padding: 40px; display: flex; flex-direction: column; gap: 24px; border: 1px solid #E0D5C5; }
.hero-img { width: 100%; height: var(--hero-height); object-fit: contain; border-radius: 20px; }
.meta-row { display: flex; gap: 20px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 8px; border: 1px solid #C8A97E; padding: 10px 18px; border-radius: 100px; font-size: 18px; color: #8B7355; font-weight: 500; }
.meta-item span { font-size: 20px; }
section { display: flex; flex-direction: column; gap: 18px; }
h2 { font-family: 'Playfair Display', serif; font-size: 34px; color: #B88A44; border-bottom: 1px solid #C8A97E; padding-bottom: 8px; }
ul, ol { padding-left: 24px; display: flex; flex-direction: column; gap: 8px; }
li { font-size: var(--step-size); color: #2d2d44; line-height: 1.5; }
li::marker { color: #B88A44; }
.ingredient-row { display: flex; justify-content: space-between; font-size: 22px; padding: 8px 0; border-bottom: 1px solid #EDE6DB; }
.ingredient-name { color: #2d2d44; }
.ingredient-amount { color: #B88A44; font-weight: 500; }
.ingredient-section { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #B88A44; padding: 12px 0 4px; border-bottom: 1px solid #C8A97E; margin-top: 8px; }
.step-item { font-size: var(--step-size); color: #2d2d44; padding: 6px 0; }
.step-section-label { font-family: 'Playfair Display', serif; font-weight: 700; color: #B88A44; }
.tips-section { background: #F8F5F0; border-radius: 16px; padding: 28px 36px; }
.tip-item { font-size: 20px; color: #2d2d44; padding: 4px 0; }
.footer { text-align: center; font-size: 16px; color: #A09DB0; margin-top: auto; padding-top: 20px; border-top: 1px solid #EDE6DB; font-style: italic; }
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
<div class="footer">${footerText}</div>
</div>
</body>
</html>`;
}