# Recipe Result Actions Design

## Goal

Turn the `🎂 Создать рецепт` flow into a connected product flow where each generated recipe is delivered as its own result block with its own follow-up actions:

- `✨ Создать карточку рецепта`
- `📏 Пересчитать рецепт`
- `👨‍🍳 Задать вопрос`

The bot must reuse saved recipe context instead of asking the user to paste the recipe again.

## Problem

The current recipe flow sends one large combined text and then separately generates photos. This has three UX problems:

1. The response is harder to read when 2-4 recipes are merged into one long message.
2. The recipe-card feature currently expects the user to send recipe text manually.
3. Follow-up actions are not tied to a specific generated recipe, so the product feels like separate tools instead of one connected workflow.

## Desired User Flow

### Step 1: Generate recipes

The user selects `🎂 Создать рецепт` and sends ingredients or a recipe search request.

The AI returns 2-4 structured recipes when available.

### Step 2: Deliver recipes one by one

For each generated recipe, the bot:

1. Creates and saves a persistent recipe result record.
2. Sends the text for that specific recipe.
3. Sends the image for that specific recipe.
4. Attaches inline buttons for that specific recipe:
   - `✨ Создать карточку рецепта`
   - `📏 Пересчитать рецепт`
   - `👨‍🍳 Задать вопрос`

This replaces the current merged “all recipes in one text block” presentation for the normal result delivery path.

### Step 3: Reuse saved context

When the user presses one of the inline buttons, the bot loads the saved recipe result by `recipeId` and launches the next feature from that stored context.

The user must not be asked to re-paste the recipe.

## Scope

This design covers:

- Persistent storage for generated recipe results.
- Per-recipe Telegram result delivery.
- Context-aware callback actions for recipe card, recalculation, and ask-chef.
- Reusing existing image URLs and recipe data for recipe-card generation.

This design does not include:

- Automatic card generation immediately after recipe generation.
- Premium-only “always create card automatically” behavior.
- New admin UI for browsing stored recipe results.

## Architecture

### New Persistence Model

Add a new Prisma model named `GeneratedRecipeContext`.

Suggested fields:

- `id: String @id @default(cuid())`
- `userId: String`
- `recipeText: String`
- `recipeJson: Json?`
- `imageUrl: String?`
- `source: String`
- `createdAt: DateTime @default(now())`

Relations:

- `userId` references `User.id`

Notes:

- `recipeJson` stores the structured recipe object for a single recipe, not the entire multi-recipe response.
- `source` initially uses the value `create_recipe`.
- One generated recipe maps to one stored context record.

### Repository Layer

Add a repository for generated recipe contexts with focused operations:

- `create(input)`
- `findById(id)`

The first implementation does not need list, delete, or cleanup APIs.

### Bot Delivery Pattern

The recipe bot handler changes from:

- generate all recipes
- merge all recipe text into one long message
- generate photos separately

to:

- generate all recipes
- iterate through recipes in order
- for each recipe:
  - format text for just that recipe
  - generate its image if tokens allow
  - save `GeneratedRecipeContext`
  - send text
  - send photo with inline buttons

If no image can be generated because no slots remain, the bot still sends the recipe text and can still save context with `imageUrl = null`.

## Callback Design

Each recipe gets its own callback set:

- `create_recipe_card:<recipeId>`
- `recipe_recalculate:<recipeId>`
- `ask_chef_recipe:<recipeId>`

Each callback loads the exact saved recipe context for that recipe.

### Recipe Card Callback

Flow:

1. Load `GeneratedRecipeContext` by `recipeId`.
2. If missing, reply with `Не удалось найти рецепт. Создайте рецепт заново.`
3. Show a short progress message.
4. Run recipe-card generation using:
   - `recipe.recipeJson` if present
   - otherwise `recipe.recipeText`
   - `recipe.imageUrl` if present
5. Send the produced PNG cards in order.

Important rule:

The recipe-card feature must not regenerate the recipe text. It may only structure/compress the saved recipe into card output and render from that context.

### Recalculation Callback

The button is bound to the specific `recipeId`, but the first implementation can start the recalculation scenario by storing the chosen recipe context in session and prompting for the recalculation details.

The key requirement is that the selected recipe is explicit and preserved.

### Ask-Chef Callback

The button is bound to the specific `recipeId`, but the first implementation can start the ask-chef scenario by storing the chosen recipe context in session and prompting for the user’s question about that recipe.

The key requirement is that the selected recipe is explicit and preserved.

## Service Changes

### Recipe Flow

`src/bot/handlers/recipes.ts` needs a delivery refactor:

- Stop relying on one combined `recipeText` for the user-facing result stream.
- Send each recipe as its own unit.
- Preserve existing recipe follow-up session logic for ingredient adjustments.

The session fields used for recipe scenario continuation may still keep a combined summary if needed for “show all” behavior, but user-facing delivery should become per-recipe.

### Recipe Card Service

`src/features/recipe-card/recipe-card-service.ts` must support context-based card creation:

- input from structured recipe JSON when available
- fallback input from raw recipe text
- optional pre-generated `imageUrl`

If `imageUrl` exists in saved context, the service should reuse it instead of generating a new hero image.

Only if no saved image is available should the existing fallback image-generation behavior remain available.

## Error Handling

### Missing Context

If a callback references a missing or stale `recipeId`, return:

`Не удалось найти рецепт. Создайте рецепт заново.`

### Partial Image Availability

If recipe text is generated but no photo token is available:

- still save context
- still allow follow-up actions
- recipe-card may proceed with `imageUrl = null`

### Callback Ownership

When loading a `recipeId`, ensure it belongs to the current user. A user must not be able to access another user’s recipe context via callback tampering.

If the record exists but belongs to another user, treat it as not found.

## Testing Strategy

Add tests first for the new behavior:

1. Repository tests for `GeneratedRecipeContext`.
2. Recipe handler tests verifying:
   - each generated recipe is sent separately
   - each recipe gets its own callback buttons
   - context is saved per recipe
3. Recipe-card callback tests verifying:
   - saved context is loaded by `recipeId`
   - missing context returns the user-facing error
   - saved `imageUrl` is reused
4. Follow-up callback tests for recalculation and ask-chef scenario binding.

## Documentation Updates

After implementation:

- update `docs/architecture.md`
- update `docs/database.md`
- update `docs/prompts.md` only if prompt behavior changes materially
- update `docs/roadmap.md`
- update `docs/decisions.md` if we want to record the explicit product decision that recipe follow-up actions are context-bound per generated recipe

## Trade-offs

### Why this is better than automatic card creation

- lower cost
- faster first response
- less wasted image/card rendering
- better user control

### Why this is better than storing only in TelegramSession

- callback data can point to a stable `recipeId`
- context survives scenario switching
- future features can reuse the same stored result
- cleaner separation between navigation/session state and durable generated content

## Implementation Notes

- The first implementation should keep the default card template as `minimal`.
- The callback-based recipe-card flow should coexist with the existing text-based recipe-card path until the team chooses to remove manual input mode.
- The likely cause of “only 2 recipes are arriving now” must be verified during implementation by checking both the AI output count and the bot-side delivery logic.

## Non-Goals for This Iteration

- automatic card creation
- admin result history UI
- cleanup job for old generated recipe contexts
- cross-device browsing of previous generated recipes
