export type RecipeDifficulty = "easy" | "medium" | "hard";

export type StructuredRecipe = {
  name: string;
  whyFits: string;
  ingredients: string[];
  steps: string[];
  activeTime: string;
  chillingTime: string;
  totalTime: string;
  difficulty: RecipeDifficulty;
  pastryTip: string;
  imagePrompt: string;
};

export type RecipeOutput = {
  recipes: StructuredRecipe[];
};
