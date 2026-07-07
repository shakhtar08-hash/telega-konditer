import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";
import type { CardTemplate } from "./templates";
import { getTemplateCss } from "./templates";

function ingredientRows(data: RecipeCardOutput): string {
  return data.ingredients
    .map(
      (item) =>
        `<div class="ingredient-row"><span class="ingredient-name">${item.name}</span><span class="ingredient-amount">${item.amount}</span></div>`,
    )
    .join("");
}

function stepItems(data: RecipeCardOutput): string {
  return data.steps.map((step) => `<li class="step-item">${step}</li>`).join("");
}

function tipItems(data: RecipeCardOutput): string {
  return data.tips.map((tip) => `<li class="tip-item">${tip}</li>`).join("");
}

function metaHtml(data: RecipeCardOutput): string {
  const parts: string[] = [];
  if (data.meta.time) parts.push(`<div class="meta-item"><span>⏱</span> ${data.meta.time}</div>`);
  if (data.meta.yield) parts.push(`<div class="meta-item"><span>🍽</span> ${data.meta.yield}</div>`);
  if (parts.length === 0) return "";
  return `<div class="meta-row">${parts.join("")}</div>`;
}

export function renderRecipeCardHtml(data: RecipeCardOutput, template: CardTemplate = "minimal", imageUrl?: string): string {
  const css = getTemplateCss(template);
  const meta = metaHtml(data);
  const heroContent = imageUrl
    ? `<img src="${imageUrl}" alt="${data.title}" style="width:100%;height:100%;object-fit:cover;border-radius:24px;" />`
    : "🍰";
  const tipHtml = data.tips.length > 0
    ? `<div class="tips-section"><h2>💡 Советы</h2><ul>${tipItems(data)}</ul></div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="recipe-card">
<div>
<h1>${data.title}</h1>
${data.description ? `<p class="description">${data.description}</p>` : ""}
</div>
<div class="hero-block">
<div class="hero-placeholder">${heroContent}</div>
${meta}
</div>
<section>
<h2>Ингредиенты</h2>
<div>${ingredientRows(data)}</div>
</section>
<section>
<h2>Приготовление</h2>
<ol>${stepItems(data)}</ol>
</section>
${tipHtml}
<div class="footer">AI Кондитер · рецепт создан с помощью нейросети</div>
</div>
</body>
</html>`;
}