import type { RecipeOutput, StructuredRecipe } from "@/ai/schemas/recipe";

export type StructuredRecipeOutput = RecipeOutput;

const difficultyLabels: Record<StructuredRecipe["difficulty"], string> = {
  easy: "🟢 Легко",
  medium: "🟡 Средне",
  hard: "🔴 Сложно",
};

export function buildRecipeImagePrompt(recipe: StructuredRecipe) {
  return recipe.imagePrompt.trim();
}

export function formatRecipeOutputForTelegram(output: StructuredRecipeOutput) {
  const count = output.recipes.length;
  const intro = `Нашел ${count} ${pluralizeRecipeVariants(count)}.`;
  const recipes = output.recipes.map(formatRecipeForTelegram);

  return [intro, ...recipes].join("\n\n");
}

function formatRecipeForTelegram(recipe: StructuredRecipe, index: number) {
  return [
    `${index + 1}. Название`,
    recipe.name,
    "",
    "2. Почему подходит",
    recipe.whyFits,
    "",
    "3. Ингредиенты",
    ...recipe.ingredients.map((item) => `- ${item}`),
    "",
    "4. Полная технология приготовления",
    ...recipe.steps.map((step, stepIndex) => `${stepIndex + 1}. ${step}`),
    "",
    "5. Время приготовления",
    `- Активное время: ${recipe.activeTime}`,
    `- Охлаждение/заморозка: ${recipe.chillingTime}`,
    `- Общее время: ${recipe.totalTime}`,
    "",
    "6. Сложность",
    difficultyLabels[recipe.difficulty],
    "",
    "7. Совет кондитера",
    recipe.pastryTip,
  ].join("\n");
}

function pluralizeRecipeVariants(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "подходящий вариант";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "подходящих варианта";
  }

  return "подходящих вариантов";
}
