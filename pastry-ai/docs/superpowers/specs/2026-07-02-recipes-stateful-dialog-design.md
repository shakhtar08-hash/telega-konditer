# Recipes Stateful Dialog Design

**Date:** 2026-07-02

**Scope:** First-stage redesign of the `recipes` Telegram scenario so it behaves like a stateful assistant instead of a one-shot prompt launcher.

## Problem

The current `recipes` flow is optimized for a single input and a single output. The bot stores very little context and relies on fragile text heuristics to guess whether a second user message is a follow-up or a brand-new search.

This causes repeated or stale answers when the user naturally continues the conversation with messages like:

- `добавь яйца`
- `давай добавим яйца и разрыхлитель`
- `убери клубнику`
- `замени маскарпоне на творожный сыр`
- `покажи рецепт 2`

Today these messages can be misrouted as independent prompt inputs instead of operations on the current recipe scenario state.

## Goal

Turn `recipes` into a stateful Telegram scenario that:

- keeps a live ingredient set inside the session;
- applies common ingredient modifications deterministically;
- distinguishes between search, refinement, and recipe display actions;
- avoids sending every free-form user message directly into the recipe generator;
- resets cleanly on `/start`, `/menu`, and `/stop`.

## Non-Goals

This stage does not attempt to make every text scenario in the bot fully conversational.

This stage does not introduce a general LLM-powered memory layer for the whole bot.

This stage does not require a full workflow engine for every recipe sub-mode. The architecture should leave room for that later, but the first delivery should stay focused and small.

## Product Behavior

### Scenario Model

`recipes` becomes a scenario with explicit session state. The bot should no longer depend on the last raw message alone.

### Desired User Experience

1. User sends an ingredient list.
2. Bot stores it as the current ingredient state.
3. Bot generates a recipe list from that state.
4. User can modify the ingredient set with short natural commands.
5. Bot updates the current ingredient state first, then generates or displays the correct next result.

### Supported First-Stage Intents

The first stage should explicitly support these common intents:

- `set_ingredients`
- `add_ingredients`
- `remove_ingredients`
- `replace_ingredients`
- `show_all_recipes`
- `show_recipe_details`
- `refine_search`
- `restart`
- `unknown`

### Examples

#### Ingredient state update

Initial message:

`Есть сливки, клубника`

Then:

`добавь яйца`

Expected behavior:

- session ingredient state becomes `сливки, клубника, яйца`;
- bot performs a new recipe search using the updated set;
- bot must not simply repeat the old answer.

#### Replace ingredient

Initial state:

`сливки, маскарпоне, клубника`

Then:

`замени маскарпоне на творожный сыр`

Expected behavior:

- state is updated;
- old ingredient is removed from current state;
- new ingredient is added;
- next recipe answer is based on the new state.

#### Show recipe details

After a recipe list is shown:

`покажи рецепт 2`

Expected behavior:

- bot uses the current scenario state and the last visible recipe list context;
- bot does not treat the message as a new ingredient search.

#### Unknown follow-up

If the user sends something that does not match a supported recipe intent:

- bot should not blindly forward it to the generator as a new recipe search;
- bot should ask a short clarifying question.

## Architecture

The `recipes` flow should be split into four focused units.

### 1. Recipe Session State

Responsible for storing and clearing recipe scenario state inside `BotSession`.

Suggested state fields:

- `baseIngredientsText?: string`
- `currentIngredientsText?: string`
- `lastRecipeListText?: string`
- `lastShownRecipe?: string`
- `lastIntent?: "search" | "show_all" | "show_one" | "modify_ingredients" | "refine" | "restart"`
- `scenarioStep?: "idle" | "ingredients_set" | "results_shown" | "recipe_shown"`

This state is recipe-specific and must be fully cleared by `/start`, `/menu`, and `/stop`.

### 2. Recipe Intent Parser

Responsible for mapping the current user message to an explicit intent before any AI generation happens.

The parser should be deterministic for the supported first-stage commands and should prefer simple heuristics over model-based classification.

Examples:

- `добавь яйца` -> `add_ingredients`
- `убери клубнику` -> `remove_ingredients`
- `замени маскарпоне на творожный сыр` -> `replace_ingredients`
- `покажи все` -> `show_all_recipes`
- `покажи рецепт 2` -> `show_recipe_details`
- `без яиц` -> `refine_search`

### 3. Recipe State Reducer

Responsible for applying an intent to the current recipe session state.

It should:

- set initial ingredient state from a new ingredient message;
- add, remove, or replace ingredients in the current state;
- update `scenarioStep`;
- record the last action taken;
- preserve state when showing recipe details;
- decide when there is not enough information to continue.

### 4. Recipe Response Orchestrator

Responsible for deciding what the bot should do next after state reduction.

Possible outcomes:

- run a fresh recipe search;
- show all recipe details;
- show one selected recipe;
- ask a clarifying question;
- ask the user to send ingredients first.

The orchestrator is the only place that should call the recipe service from the Telegram handler path.

## Prompt Strategy

The recipe AI input should stop relying on raw stitched chat fragments as the main contract.

Instead, the bot should send a normalized request that explicitly includes:

- current ingredient state;
- user action type;
- refinement or modification summary when relevant;
- recipe selection context when relevant.

### Prompt Modes

The first stage should support two logical prompt modes:

- `search` - build a recipe list from the current ingredient set;
- `refine` - rebuild the recipe list after an ingredient change or search constraint.

This does not necessarily require two database prompt rows immediately, but the runtime contract should distinguish the two modes clearly.

### Prompt Safety Rule

When the user modifies the ingredient set, the prompt must explicitly instruct the model to rebuild the answer from the updated set and not repeat the previous result unchanged.

## Error Handling

### Missing state

If the user tries to refine or show recipes before sending ingredients:

- bot replies with a short message asking for ingredients first.

### Unknown intent

If the message cannot be confidently mapped to a supported recipe intent:

- bot replies with a short clarification prompt;
- bot does not send that message directly into the recipe generator as a new search.

### Scenario reset

These entry points must fully reset recipe state:

- `/start`
- `/menu`
- `/stop`
- selecting a new prompt scenario from the menu

## Testing Requirements

The implementation must add regression coverage for:

- creating recipe state from a new ingredient message;
- `add_ingredients` updates the current state;
- `remove_ingredients` updates the current state;
- `replace_ingredients` updates the current state;
- `show_all_recipes` preserves the current ingredient state;
- `show_recipe_details` does not trigger a new ingredient search;
- unknown follow-up messages do not go directly to recipe generation;
- `/start`, `/menu`, and `/stop` fully clear recipe scenario state.

## Delivery Order

Implementation should proceed in this order:

1. Extend `BotSession` with recipe-specific state fields and helpers.
2. Introduce a deterministic recipe intent parser.
3. Introduce a reducer that applies supported intents to recipe state.
4. Refactor the recipe handler into an orchestrator that uses parser + reducer + service calls.
5. Update recipe prompt construction to use normalized structured context for `search` and `refine`.
6. Run regression tests and manual Telegram scenario checks.

## Constraints

- Keep Telegram user-facing text in Russian.
- Reuse existing project patterns where possible.
- Avoid broad bot-wide refactors in this stage.
- Prefer deterministic handling for common recipe follow-ups over model guessing.
- Preserve current `/start`, `/menu`, and `/stop` behavior while making recipe-state reset explicit and complete.

## Success Criteria

The stage is successful when:

- repeated recipe answers caused by stale or misclassified follow-ups stop occurring for the supported commands;
- ingredient modifications change the current scenario state before generation;
- recipe detail requests are routed as scenario actions rather than new searches;
- unclear user follow-ups are clarified instead of being silently misrouted;
- the recipe scenario behaves predictably across multiple messages in one Telegram session.
