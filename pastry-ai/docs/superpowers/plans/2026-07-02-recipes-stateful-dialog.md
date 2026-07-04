# Recipes Stateful Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Telegram `recipes` scenario into a stateful multi-message flow that tracks current ingredients and routes follow-up messages deterministically.

**Architecture:** Keep the existing bot/service layout, but split recipe logic into four focused units: recipe session state helpers, an intent parser, a state reducer, and a response orchestrator inside the Telegram recipe handler. AI generation keeps flowing through the existing recipe service, but the handler sends normalized `search` and `refine` context instead of fragile raw follow-up text.

**Tech Stack:** Next.js 16, TypeScript, grammY, Prisma-backed session storage, Vitest.

## Global Constraints

- Work inside `C:\Users\Roof\Documents\Телега\pastry-ai`.
- Keep Telegram user-facing text in Russian.
- Reuse existing project patterns and keep the scope limited to the `recipes` scenario.
- Do not add a bot-wide memory layer in this stage.
- Prefer deterministic parsing for common follow-ups over model guessing.
- Before changing production behavior, write a failing Vitest test and verify it fails for the expected reason.

---

## File Structure Map

- `src/bot/context.ts`: extend `BotSession` with recipe-specific session state and reset helpers.
- `src/bot/context.test.ts`: state helper regression tests.
- `src/bot/handlers/recipe-intent.ts`: deterministic recipe follow-up parser.
- `src/bot/handlers/recipe-intent.test.ts`: parser regression tests.
- `src/bot/handlers/recipe-state.ts`: reducer that applies parsed intents to recipe session state.
- `src/bot/handlers/recipe-state.test.ts`: reducer regression tests.
- `src/bot/handlers/recipes.ts`: orchestrator that uses parser + reducer + recipe service.
- `src/bot/handlers/recipes.test.ts`: handler-level helper regressions.
- `src/bot/commands/start.ts`: ensure recipe state resets on `/start`, `/menu`, and prompt selection.
- `docs/architecture.md`: record stateful recipe flow.
- `docs/roadmap.md`: record completed recipe dialog upgrade.

---

### Task 1: Add Recipe Session State Helpers

**Files:**
- Modify: `src/bot/context.ts`
- Modify: `src/bot/context.test.ts`

**Interfaces:**
- Produces: `type RecipeScenarioStep = "idle" | "ingredients_set" | "results_shown" | "recipe_shown"`
- Produces: `type RecipeLastIntent = "search" | "show_all" | "show_one" | "modify_ingredients" | "refine" | "restart"`
- Produces: `clearRecipeScenario(session: BotSession): void`
- Produces: `setRecipeIngredients(session: BotSession, input: { baseIngredientsText: string; currentIngredientsText: string }): void`

- [ ] **Step 1: Write the failing state tests**

Add these tests to `src/bot/context.test.ts`:

```ts
it("stores recipe scenario ingredients and step", () => {
  const session = {};

  setRecipeIngredients(session, {
    baseIngredientsText: "сливки, клубника",
    currentIngredientsText: "сливки, клубника, яйца",
  });

  expect(session).toMatchObject({
    baseIngredientsText: "сливки, клубника",
    currentIngredientsText: "сливки, клубника, яйца",
    recipeScenarioStep: "ingredients_set",
    recipeLastIntent: "search",
  });
});

it("clears full recipe scenario state", () => {
  const session = {
    baseIngredientsText: "сливки",
    currentIngredientsText: "сливки, яйца",
    lastRecipeListText: "Нашел 3 варианта",
    lastShownRecipe: "2",
    recipeScenarioStep: "results_shown" as const,
    recipeLastIntent: "modify_ingredients" as const,
  };

  clearRecipeScenario(session);

  expect(session).toMatchObject({
    baseIngredientsText: undefined,
    currentIngredientsText: undefined,
    lastRecipeListText: undefined,
    lastShownRecipe: undefined,
    recipeScenarioStep: "idle",
    recipeLastIntent: undefined,
  });
});
```

- [ ] **Step 2: Run the state tests and verify they fail**

Run: `npm test -- src/bot/context.test.ts`

Expected: FAIL because the new recipe session fields and helpers do not exist yet.

- [ ] **Step 3: Implement minimal session state support**

Update `src/bot/context.ts` to add:

```ts
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
  lastFeature?: "recipes" | "vision" | "photoshoot" | "carousel";
  lastPromptSlug?: string;
  lastRecipeRequestText?: string;
  baseIngredientsText?: string;
  currentIngredientsText?: string;
  lastRecipeListText?: string;
  lastShownRecipe?: string;
  recipeScenarioStep?: RecipeScenarioStep;
  recipeLastIntent?: RecipeLastIntent;
};

export function clearRecipeScenario(session: BotSession) {
  session.lastRecipeRequestText = undefined;
  session.baseIngredientsText = undefined;
  session.currentIngredientsText = undefined;
  session.lastRecipeListText = undefined;
  session.lastShownRecipe = undefined;
  session.recipeScenarioStep = "idle";
  session.recipeLastIntent = undefined;
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
```

Then make `clearScenarioSession` call `clearRecipeScenario(session)` before clearing generic prompt fields.

- [ ] **Step 4: Run the state tests and verify they pass**

Run: `npm test -- src/bot/context.test.ts`

Expected: PASS.

---

### Task 2: Add Deterministic Recipe Intent Parsing

**Files:**
- Create: `src/bot/handlers/recipe-intent.ts`
- Create: `src/bot/handlers/recipe-intent.test.ts`

**Interfaces:**
- Produces: `type RecipeIntent = { kind: "set_ingredients" | "add_ingredients" | "remove_ingredients" | "replace_ingredients" | "show_all_recipes" | "show_recipe_details" | "refine_search" | "restart" | "unknown"; payload?: string; target?: string; replacement?: string; recipeIndex?: number }`
- Produces: `parseRecipeIntent(text: string): RecipeIntent`

- [ ] **Step 1: Write the failing parser tests**

Create `src/bot/handlers/recipe-intent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseRecipeIntent } from "./recipe-intent";

describe("parseRecipeIntent", () => {
  it("parses ingredient additions", () => {
    expect(parseRecipeIntent("добавь яйца")).toMatchObject({
      kind: "add_ingredients",
      payload: "яйца",
    });
  });

  it("parses replacements", () => {
    expect(parseRecipeIntent("замени маскарпоне на творожный сыр")).toMatchObject({
      kind: "replace_ingredients",
      target: "маскарпоне",
      replacement: "творожный сыр",
    });
  });

  it("parses recipe detail requests", () => {
    expect(parseRecipeIntent("покажи рецепт 2")).toMatchObject({
      kind: "show_recipe_details",
      recipeIndex: 2,
    });
  });

  it("marks unknown follow-ups explicitly", () => {
    expect(parseRecipeIntent("что скажешь?")).toMatchObject({
      kind: "unknown",
    });
  });
});
```

- [ ] **Step 2: Run the parser tests and verify they fail**

Run: `npm test -- src/bot/handlers/recipe-intent.test.ts`

Expected: FAIL because the parser file does not exist yet.

- [ ] **Step 3: Implement the parser**

Create `src/bot/handlers/recipe-intent.ts` with logic shaped like:

```ts
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
  const normalized = text.trim().toLowerCase();
  const recipeMatch = normalized.match(/^покажи рецепт\s+(\d+)$/);
  const replaceMatch = normalized.match(/^замени\s+(.+?)\s+на\s+(.+)$/);

  if (!normalized) return { kind: "unknown", payload: text };
  if (normalized === "/stop") return { kind: "restart" };
  if (normalized === "покажи все") return { kind: "show_all_recipes" };
  if (recipeMatch) return { kind: "show_recipe_details", recipeIndex: Number(recipeMatch[1]) };
  if (replaceMatch) {
    return {
      kind: "replace_ingredients",
      target: replaceMatch[1],
      replacement: replaceMatch[2],
    };
  }
  if (normalized.startsWith("добавь ")) {
    return { kind: "add_ingredients", payload: normalized.slice("добавь ".length) };
  }
  if (normalized.startsWith("давай добавим ")) {
    return {
      kind: "add_ingredients",
      payload: normalized.slice("давай добавим ".length),
    };
  }
  if (normalized.startsWith("убери ")) {
    return { kind: "remove_ingredients", payload: normalized.slice("убери ".length) };
  }
  if (normalized.startsWith("без ")) {
    return { kind: "refine_search", payload: text.trim() };
  }
  if (text.includes(",") || text.includes("\n") || normalized.startsWith("есть ")) {
    return { kind: "set_ingredients", payload: text.trim() };
  }
  return { kind: "unknown", payload: text.trim() };
}
```

- [ ] **Step 4: Run the parser tests and verify they pass**

Run: `npm test -- src/bot/handlers/recipe-intent.test.ts`

Expected: PASS.

---

### Task 3: Add Recipe State Reducer

**Files:**
- Create: `src/bot/handlers/recipe-state.ts`
- Create: `src/bot/handlers/recipe-state.test.ts`

**Interfaces:**
- Consumes: `parseRecipeIntent(text: string): RecipeIntent`
- Produces: `applyRecipeIntent(session: BotSession, intent: RecipeIntent): { action: "search" | "show_all" | "show_one" | "clarify" | "ask_for_ingredients"; promptText?: string; recipeIndex?: number }`

- [ ] **Step 1: Write the failing reducer tests**

Create `src/bot/handlers/recipe-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyRecipeIntent } from "./recipe-state";

describe("applyRecipeIntent", () => {
  it("creates a new ingredient state from set_ingredients", () => {
    const session = {};
    const result = applyRecipeIntent(session, {
      kind: "set_ingredients",
      payload: "сливки, клубника",
    });

    expect(result).toEqual({
      action: "search",
      promptText: "сливки, клубника",
    });
    expect(session.currentIngredientsText).toBe("сливки, клубника");
  });

  it("adds ingredients to existing state", () => {
    const session = {
      baseIngredientsText: "сливки, клубника",
      currentIngredientsText: "сливки, клубника",
    };
    const result = applyRecipeIntent(session, {
      kind: "add_ingredients",
      payload: "яйца",
    });

    expect(result.action).toBe("search");
    expect(session.currentIngredientsText).toContain("яйца");
  });

  it("asks for ingredients when refining without state", () => {
    const result = applyRecipeIntent({}, { kind: "add_ingredients", payload: "яйца" });
    expect(result).toEqual({ action: "ask_for_ingredients" });
  });
});
```

- [ ] **Step 2: Run the reducer tests and verify they fail**

Run: `npm test -- src/bot/handlers/recipe-state.test.ts`

Expected: FAIL because the reducer file does not exist yet.

- [ ] **Step 3: Implement the reducer**

Create `src/bot/handlers/recipe-state.ts` with helpers that:

```ts
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
```

and `applyRecipeIntent(...)` that:

- stores new ingredient state for `set_ingredients`;
- updates `currentIngredientsText` for `add_ingredients`, `remove_ingredients`, and `replace_ingredients`;
- returns `{ action: "search", promptText: session.currentIngredientsText }` after ingredient changes;
- returns `{ action: "show_all" }` for `show_all_recipes`;
- returns `{ action: "show_one", recipeIndex }` for `show_recipe_details`;
- returns `{ action: "clarify" }` for `unknown`;
- returns `{ action: "ask_for_ingredients" }` if the user tries to refine before any ingredient state exists.

- [ ] **Step 4: Run the reducer tests and verify they pass**

Run: `npm test -- src/bot/handlers/recipe-state.test.ts`

Expected: PASS.

---

### Task 4: Refactor Recipe Handler Into an Orchestrator

**Files:**
- Modify: `src/bot/handlers/recipes.ts`
- Modify: `src/bot/handlers/recipes.test.ts`
- Modify: `src/bot/commands/start.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: `parseRecipeIntent(text: string): RecipeIntent`
- Consumes: `applyRecipeIntent(session: BotSession, intent: RecipeIntent): { action: ... }`
- Produces: handler behavior that only calls `recipeService.createFromIngredients` for `search` actions

- [ ] **Step 1: Write the failing handler regressions**

Add these tests to `src/bot/handlers/recipes.test.ts`:

```ts
it("treats recipe detail requests as scenario actions instead of new searches", () => {
  expect(shouldGenerateRecipeSearch("show_one")).toBe(false);
});

it("treats unknown follow-ups as clarification cases", () => {
  expect(shouldGenerateRecipeSearch("clarify")).toBe(false);
});
```

If `shouldGenerateRecipeSearch` does not exist yet, this test should fail because the helper is missing.

- [ ] **Step 2: Run the handler tests and verify they fail**

Run: `npm test -- src/bot/handlers/recipes.test.ts`

Expected: FAIL because the orchestrator helper does not exist yet.

- [ ] **Step 3: Implement the orchestrator and reset behavior**

Update `src/bot/handlers/recipes.ts` so the text handler:

```ts
const intent = parseRecipeIntent(ctx.message.text);
const result = applyRecipeIntent(ctx.session, intent);

if (result.action === "ask_for_ingredients") {
  await ctx.reply("Сначала пришлите список ингредиентов, с которыми будем работать.");
  return;
}

if (result.action === "clarify") {
  await ctx.reply("Уточните, пожалуйста: добавить ингредиенты, убрать что-то или показать рецепт из найденных вариантов?");
  return;
}

if (result.action === "show_all") {
  await ctx.reply("Пока поддержан повторный подбор по обновленному списку ингредиентов. Для детализации выберите рецепт сообщением вида: покажи рецепт 2.");
  return;
}

if (result.action === "show_one") {
  await ctx.reply(`Показываю рецепт №${result.recipeIndex}. Подробная адресация следующей итерацией будет привязана к сохраненному списку результатов.`);
  return;
}

await ctx.reply(processingMessage);
const recipeText = await dependencies.recipeService.createFromIngredients({
  ingredientsText: buildRecipePromptText(result.promptText ?? "", ctx.session.currentIngredientsText),
  promptSlug: ctx.session.lastPromptSlug,
});
ctx.session.lastRecipeListText = recipeText;
ctx.session.recipeScenarioStep = "results_shown";
```

Also update `src/bot/commands/start.ts` to ensure `/start`, `/menu`, and prompt selection still clear recipe scenario state through the shared reset helper.

Add `shouldGenerateRecipeSearch` as a small exported helper in `recipes.ts` if the tests use it.

- [ ] **Step 4: Update prompt text builder for refine safety**

Update `buildRecipePromptText(...)` so follow-up refine requests produce instructions like:

```ts
"Это продолжение текущего сценария. Используй обновленный список ингредиентов и пересобери ответ с учетом изменения. Не повторяй прошлый результат без изменений."
```

The builder should prefer `currentIngredientsText` as the current source of truth for refinement.

- [ ] **Step 5: Run focused regression checks**

Run: `npm test -- src/bot/context.test.ts src/bot/handlers/recipe-intent.test.ts src/bot/handlers/recipe-state.test.ts src/bot/handlers/recipes.test.ts src/bot/commands/start.test.ts`

Expected: PASS.

- [ ] **Step 6: Run typecheck and update docs**

Run: `npm run typecheck`

Expected: PASS.

Then update `docs/architecture.md` and `docs/roadmap.md` to describe the stateful recipe scenario and the new deterministic follow-up routing.

---

## Self-Review Notes

- Spec coverage: The plan covers session state, deterministic intent parsing, state reduction, orchestrated handler behavior, prompt safety, reset behavior, tests, and docs.
- Placeholder scan: No `TODO` or vague “handle edge cases” steps remain; each task includes concrete files, code shapes, and verification commands.
- Type consistency: `RecipeIntent`, `RecipeScenarioStep`, and orchestrator action names are introduced before downstream tasks use them.
