import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardSize } from "./size-config";
import { renderIngredientRows, renderMetaHtml, renderStepItems, sizeCssVars } from "./utils";

export function renderDarkHtml(
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
    ? `<div class="hero-block"><img src="${imageUrl}" alt="${data.title}" class="hero-img" />${meta}</div>`
    : meta ? `<div class="hero-block">${meta}</div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${sizeCssVars(size)}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { display: flex; justify-content: center; align-items: center; font-family: 'Inter', system-ui, sans-serif; background: #0D0D0D; }
.recipe-card { width: 1080px; min-height: var(--card-min-height); display: flex; flex-direction: column; background: #1A1A1A; border-radius: 32px; padding: var(--card-padding); gap: var(--gap); border: 1px solid #2A2A2A; }
h1 { font-size: var(--title-size); font-weight: 700; color: #F5F0EB; line-height: 1.15; }
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
.footer { text-align: center; font-size: 16px; color: #555; margin-top: auto; padding-top: 16px; border-top: 1px solid #2A2A2A; }
</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${data.title}</h1>
</div>
${heroHtml}
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
</body>
</html>`;
}
