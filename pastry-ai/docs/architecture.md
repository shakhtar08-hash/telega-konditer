# Architecture

AI Pastry Assistant is a Next.js App Router application with a Telegram bot, admin panel, Supabase Postgres database, and AI feature services.

## Stack

- Next.js 16 App Router, React 19, TypeScript.
- grammY for Telegram bot handling.
- Prisma 7 with Supabase Postgres through `@prisma/adapter-pg`.
- Vercel AI SDK for text/object/image calls.
- OpenRouter for strong multimodal/text models.
- OpenAI image generation/editing for photo style generation.
- CloudPayments webhook route for payment access.
- Vitest for tests.

## Main Directories

- `src/app` - Next.js routes, admin pages, login, pay page, API routes.
- `src/app/api/telegram/webhook/route.ts` - Telegram webhook entrypoint.
- `src/app/admin` - Russian admin panel.
- `src/bot` - grammY bot setup, commands, middleware, Telegram handlers.
- `src/features` - feature services that coordinate agents/repositories.
- `src/ai` - prompt loader, AI provider, agents, Zod schemas.
- `src/db` - Prisma client and repositories.
- `prisma` - schema, migrations, seed data.
- `docs` - durable project context for agents and humans.

## Telegram Flow

1. Telegram sends updates to `/api/telegram/webhook`.
2. The route validates `x-telegram-bot-api-secret-token`.
3. The route claims the Telegram `update_id` in `TelegramSession` before handling it. Duplicate retry deliveries return `200 OK` without running handlers again.
4. The route creates Prisma repositories, prompt loader, AI service, feature services, and the grammY bot.
5. Bot middleware sets auth/subscription context and uses persistent grammY session storage backed by `TelegramSession`.
6. `/start` and `/menu` register the user, assign the `promo` tariff if the user has no tariff yet, clear the active scenario state, and either show onboarding or the prompt menu.
7. The prompt menu is built from `BotMenuButton` rows if they exist; otherwise it falls back to active prompts.
8. Prompt buttons start a fresh scenario session by setting `ctx.session.lastFeature` and `ctx.session.lastPromptSlug` and clearing stale recipe follow-up context.
9. Text/photo handlers use that persistent session state to route inputs to recipe, vision, or photoshoot services.
10. The `recipes` handler now parses common follow-up intents like add/remove/replace ingredients before any AI call, updates the current ingredient state in session, and only then decides whether to run a new recipe search or answer with a scenario action.
11. `/stop` clears the current scenario session state.
12. Recipe results are now delivered per-recipe: each generated recipe is saved as a durable `GeneratedRecipeContext` record, sent as its own text block, followed by its photo (if tokens allow), with inline buttons for `✨ Создать карточку рецепта`, `📏 Пересчитать рецепт`, and `👨‍🍳 Задать вопрос`. Each button is bound to the specific `recipeId` and loads saved context on click.
13. Callback handlers for `create_recipe_card:<recipeId>`, `recipe_recalculate:<recipeId>`, and `ask_chef_recipe:<recipeId>` load the saved `GeneratedRecipeContext` by `recipeId` with user ownership check. The recipe-card callback reuses the saved `recipeJson`/`recipeText`/`imageUrl` without regenerating the recipe. The recalculation and ask-chef callbacks store the selected recipe context in session fields (`selectedGeneratedRecipeId`, `selectedGeneratedRecipeText`) and switch the scenario. If an editable prompt template omits `{{recipeContext}}`, the corresponding agent appends the selected recipe context automatically at runtime.

Telegram retries webhook updates if the request times out or returns a non-2xx response. The `update_id` claim prevents duplicate AI generations when a slow AI request causes Telegram to retry the same update.

## Admin Flow

Admin pages are server-rendered under `/admin` and protected by middleware/session auth. Important sections:

- `/admin` - dashboard.
- `/admin/chat-bot` - bot menu button editor and Telegram-style preview.
- `/admin/prompts` - prompt/model/provider editor.
- `/admin/photo-styles` - photo style records.
- `/admin/funnel` - onboarding/funnel messages and buttons.
- `/admin/settings` - API key management and environment status.
- `/admin/users` - users and manual tariff assignment/editing.
- `/admin/history`, `/admin/usage` - conversations and usage/cost tracking.

## AI Feature Flow

The pattern is:

`bot handler/page -> feature service -> AI agent -> prompt loader -> AIService -> provider API`

Current AI features:

- Recipes from ingredients. The Telegram recipe flow is now stateful for common follow-ups: it keeps the current ingredient set in session, supports deterministic ingredient changes, and splits long recipe responses into multiple messages.
- Dessert photo analysis.
- Dessert photo style generation.
- Instagram carousel copy.

Text AI scenarios now require an active, non-expired `UserTariff`. They do not spend tokens by themselves; token charging is still only for image sends.

## Token Guard System

The `TokenGuardService` at `src/features/tariffs/token-guard-service.ts` centralizes all token checking and charging:

- `ensureSufficientTokens(userId, required)` — throws `UserFacingError` if tariff expired or insufficient tokens. Used by batch flows (photoshoot).
- `getAvailablePhotoSlots(userId, maxSlots)` — returns `min(maxSlots, remainingTokens)` or 0 if expired. Used by recipe flows.
- `chargeTokens(userId, feature, promptSlug, imagesSent)` — decrements `remainingTokens` and writes `TokenUsage` record. Called AFTER successful `ctx.replyWithPhoto()`.
- `getUserTariffState(userId)` — returns tariff name, slug, remaining tokens, expiry, and expiry status.

## Recipe Flow with Photo Generation

Recipe agents (`recipe-from-ingredients`, `best-recipe-search`) now return structured output:

```typescript
type RecipeOutput = {
  text: string;          // Human-readable recipe text
  dishes: Array<{        // 1-4 dishes for photo generation
    name: string;
    description: string;
  }>;
};
```

The recipe text handler sends the text first, then checks available token slots via `TokenGuardService`, generates up to `min(dishes.length, remainingTokens, 4)` photos via OpenRouter/FLUX, and charges 1 token per successful send. If 0 tokens remain, only text is sent with a note about the token limit.

## Photoshoot Flow with Token Guard

Before generating styled images, the photoshoot handler calls `ensureSufficientTokens(userId, styleCount)`. If the user has insufficient tokens for the full batch, no images are generated and a limit message is shown. After each successful image send, 1 token is charged.

## Local Bot Testing

Use a separate Telegram bot token for local testing. Run Next.js locally, expose `localhost:3000` with ngrok, and set the test bot webhook to:

```text
https://<ngrok-url>/api/telegram/webhook
```

Do not point the production bot token at ngrok unless intentionally moving production traffic to the local machine.
