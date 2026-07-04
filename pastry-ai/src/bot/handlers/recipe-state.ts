import type { BotSession } from "../context";
import { setRecipeIngredients } from "../context";
import type { RecipeIntent } from "./recipe-intent";

export type RecipeStateAction =
  | { action: "search"; promptText: string }
  | { action: "show_all" }
  | { action: "show_one"; recipeIndex: number }
  | { action: "clarify" }
  | { action: "ask_for_ingredients" };

function appendIngredients(current: string, addition: string) {
  return [current, addition].filter(Boolean).join(", ");
}

function removeIngredient(current: string, target: string) {
  return current
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== target.trim())
    .join(", ");
}

export function applyRecipeIntent(
  session: BotSession,
  intent: RecipeIntent,
): RecipeStateAction {
  if (intent.kind === "set_ingredients") {
    setRecipeIngredients(session, {
      baseIngredientsText: intent.payload,
      currentIngredientsText: intent.payload,
    });

    return {
      action: "search",
      promptText: intent.payload,
    };
  }

  if (intent.kind === "unknown") {
    if (!session.currentIngredientsText) {
      setRecipeIngredients(session, {
        baseIngredientsText: intent.payload,
        currentIngredientsText: intent.payload,
      });

      return {
        action: "search",
        promptText: intent.payload,
      };
    }

    return { action: "clarify" };
  }

  if (!session.currentIngredientsText) {
    return { action: "ask_for_ingredients" };
  }

  if (intent.kind === "add_ingredients") {
    session.currentIngredientsText = appendIngredients(
      session.currentIngredientsText,
      intent.payload,
    );
    session.recipeLastIntent = "modify_ingredients";

    return {
      action: "search",
      promptText: session.currentIngredientsText,
    };
  }

  if (intent.kind === "remove_ingredients") {
    session.currentIngredientsText = removeIngredient(
      session.currentIngredientsText,
      intent.payload,
    );
    session.recipeLastIntent = "modify_ingredients";

    return {
      action: "search",
      promptText: session.currentIngredientsText,
    };
  }

  if (intent.kind === "replace_ingredients") {
    session.currentIngredientsText = appendIngredients(
      removeIngredient(session.currentIngredientsText, intent.target),
      intent.replacement,
    );
    session.recipeLastIntent = "modify_ingredients";

    return {
      action: "search",
      promptText: session.currentIngredientsText,
    };
  }

  if (intent.kind === "show_all_recipes") {
    session.recipeLastIntent = "show_all";
    return { action: "show_all" };
  }

  if (intent.kind === "show_recipe_details") {
    session.lastShownRecipe = String(intent.recipeIndex);
    session.recipeLastIntent = "show_one";
    return { action: "show_one", recipeIndex: intent.recipeIndex };
  }

  if (intent.kind === "refine_search") {
    session.recipeLastIntent = "refine";
    return {
      action: "search",
      promptText: `${session.currentIngredientsText}\n\nОграничение: ${intent.payload}`,
    };
  }

  return { action: "clarify" };
}
