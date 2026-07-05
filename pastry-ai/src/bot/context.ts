import type { Context, SessionFlavor } from "grammy";

export type RecipeScenarioStep =
  | "idle"
  | "ingredients_set"
  | "results_shown"
  | "recipe_shown";

export type RecipeLastIntent =
  | "search"
  | "show_all"
  | "show_one"
  | "modify_ingredients"
  | "refine"
  | "restart";

export type BotSession = {
  lastFeature?: "recipes" | "vision" | "photoshoot" | "carousel" | "photoshoot-single-style";
  lastPromptSlug?: string;
  lastRecipeRequestText?: string;
  baseIngredientsText?: string;
  currentIngredientsText?: string;
  lastRecipeListText?: string;
  lastShownRecipe?: string;
  recipeScenarioStep?: RecipeScenarioStep;
  recipeLastIntent?: RecipeLastIntent;
  selectedStyleId?: string;
};

export type PastryBotContext = Context & SessionFlavor<BotSession>;

export function clearRecipeScenario(session: BotSession) {
  session.lastRecipeRequestText = undefined;
  session.baseIngredientsText = undefined;
  session.currentIngredientsText = undefined;
  session.lastRecipeListText = undefined;
  session.lastShownRecipe = undefined;
  session.recipeScenarioStep = "idle";
  session.recipeLastIntent = undefined;
}

export function clearScenarioSession(session: BotSession) {
  clearRecipeScenario(session);
  session.lastFeature = undefined;
  session.lastPromptSlug = undefined;
}

export function setRecipeIngredients(
  session: BotSession,
  input: { baseIngredientsText: string; currentIngredientsText: string },
) {
  session.baseIngredientsText = input.baseIngredientsText;
  session.currentIngredientsText = input.currentIngredientsText;
  session.recipeScenarioStep = "ingredients_set";
  session.recipeLastIntent = "search";
}

export function setActivePrompt(
  session: BotSession,
  feature: NonNullable<BotSession["lastFeature"]>,
  promptSlug: string,
) {
  clearScenarioSession(session);
  session.lastFeature = feature;
  session.lastPromptSlug = promptSlug;
}
