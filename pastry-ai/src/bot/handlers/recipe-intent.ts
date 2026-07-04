export type RecipeIntent =
  | { kind: "set_ingredients"; payload: string }
  | { kind: "add_ingredients"; payload: string }
  | { kind: "remove_ingredients"; payload: string }
  | {
      kind: "replace_ingredients";
      target: string;
      replacement: string;
    }
  | { kind: "show_all_recipes" }
  | { kind: "show_recipe_details"; recipeIndex: number }
  | { kind: "refine_search"; payload: string }
  | { kind: "restart" }
  | { kind: "unknown"; payload: string };

export function parseRecipeIntent(text: string): RecipeIntent {
  const trimmed = text.trim();
  const normalized = trimmed.toLowerCase();
  const recipeMatch = normalized.match(/^покажи рецепт\s+(\d+)$/);
  const replaceMatch = normalized.match(/^замени\s+(.+?)\s+на\s+(.+)$/);

  if (!normalized) {
    return { kind: "unknown", payload: trimmed };
  }

  if (normalized === "/stop") {
    return { kind: "restart" };
  }

  if (normalized === "покажи все") {
    return { kind: "show_all_recipes" };
  }

  if (recipeMatch) {
    return {
      kind: "show_recipe_details",
      recipeIndex: Number(recipeMatch[1]),
    };
  }

  if (replaceMatch) {
    return {
      kind: "replace_ingredients",
      target: replaceMatch[1],
      replacement: replaceMatch[2],
    };
  }

  if (normalized.startsWith("добавь ")) {
    return {
      kind: "add_ingredients",
      payload: trimmed.slice("добавь ".length),
    };
  }

  if (normalized.startsWith("давай добавим ")) {
    return {
      kind: "add_ingredients",
      payload: trimmed.slice("давай добавим ".length),
    };
  }

  if (normalized.startsWith("убери ")) {
    return {
      kind: "remove_ingredients",
      payload: trimmed.slice("убери ".length),
    };
  }

  if (normalized.startsWith("без ")) {
    return {
      kind: "refine_search",
      payload: trimmed,
    };
  }

  if (trimmed.includes(",") || trimmed.includes("\n") || normalized.startsWith("есть ")) {
    return {
      kind: "set_ingredients",
      payload: trimmed,
    };
  }

  return {
    kind: "unknown",
    payload: trimmed,
  };
}
