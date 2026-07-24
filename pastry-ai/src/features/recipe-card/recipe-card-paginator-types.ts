export type CardPageSection = "ingredients" | "steps" | "tips";

export type RecipeCardPage = {
  sections: CardPageSection[];
  startStepIndex?: number;
  continuationTitle?: string;
};