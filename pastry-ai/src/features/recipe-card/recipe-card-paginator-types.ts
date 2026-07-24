import type { RecipeCardOutput } from "@/ai/schemas/recipe-card";

export type CardPageSection = "header" | "hero" | "ingredients" | "steps" | "tips";

export type RecipeCardPage = {
  pageNumber: number;
  totalPages: number;
  title: string;
  description: string;
  imageUrl?: string;
  meta: RecipeCardOutput["meta"];
  ingredients: RecipeCardOutput["ingredients"];
  steps: string[];
  tips: string[];
  /** Which sections are visible on this page */
  sections: CardPageSection[];
  /** Continuation markers */
  isIngredientsContinuation: boolean;
  isStepsContinuation: boolean;
  isTipsContinuation: boolean;
  /** Starting step number (1-based) for the <ol start="N"> */
  stepStartIndex: number;
};