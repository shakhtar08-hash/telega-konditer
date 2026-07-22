import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { renderIngredientRows, renderMetaHtml, renderStepItems, sizeCssVars } from "./utils";

export function renderPinterestHtml(
  data: RecipeCardOutput,
  imageUrl: string | undefined,
  size: CardSize,
  pageLabel?: string,
): string {
  const footerText = pageLabel ?? "AI Кондитер · рецепт создан с помощью нейросети";
  const hasIngredients = data.ingredients.length > 0;
  const hasSteps = data.steps.length > 0;
  const meta = renderMetaHtml(data.meta);
  const heroHtml = imageUrl
    ? `<div class="hero-area"><img src="${imageUrl}" alt="${data.title}" class="hero-img" /><div class="hero-overlay"></div></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #F0EBE3; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.06); }
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
</style>
</head>
<body>
<div class="recipe-card">
${heroHtml}
<div class="card-content">
<h1>${data.title}</h1>
${data.description ? `<p class="description">${data.description}</p>` : ""}
${meta}
${hasIngredients ? `<section>
<h2>Ингредиенты</h2>
<div>${renderIngredientRows(data.ingredients)}</div>
</section>` : ""}
${hasSteps ? `<section>
<h2>Приготовление</h2>
<ol>${renderStepItems(data.steps)}</ol>
</section>` : ""}
<div class="footer">${footerText}</div>
</div>
</div>
</body>
</html>`;
}
