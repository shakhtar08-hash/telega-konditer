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
6. `/start` and `/menu` register the user, clear the active scenario state, and either show onboarding or the prompt menu.
7. The prompt menu is built from `BotMenuButton` rows if they exist; otherwise it falls back to active prompts.
8. Prompt buttons start a fresh scenario session by setting `ctx.session.lastFeature` and `ctx.session.lastPromptSlug` and clearing stale recipe follow-up context.
9. Text/photo handlers use that persistent session state to route inputs to recipe, vision, or photoshoot services.
10. The `recipes` handler now parses common follow-up intents like add/remove/replace ingredients before any AI call, updates the current ingredient state in session, and only then decides whether to run a new recipe search or answer with a scenario action.
11. `/stop` clears the current scenario session state.

Telegram retries webhook updates if the request times out or returns a non-2xx response. The `update_id` claim prevents duplicate AI generations when a slow AI request causes Telegram to retry the same update.

## Admin Flow

Admin pages are server-rendered under `/admin` and protected by middleware/session auth. Important sections:

- `/admin` - dashboard.
- `/admin/chat-bot` - bot menu button editor and Telegram-style preview.
- `/admin/prompts` - prompt/model/provider editor.
- `/admin/photo-styles` - photo style records.
- `/admin/funnel` - onboarding/funnel messages and buttons.
- `/admin/settings` - API key management and environment status.
- `/admin/users` - users and manual subscription plan editing.
- `/admin/history`, `/admin/usage` - conversations and usage/cost tracking.

## AI Feature Flow

The pattern is:

`bot handler/page -> feature service -> AI agent -> prompt loader -> AIService -> provider API`

Current AI features:

- Recipes from ingredients. The Telegram recipe flow is now stateful for common follow-ups: it keeps the current ingredient set in session, supports deterministic ingredient changes, and splits long recipe responses into multiple messages.
- Dessert photo analysis.
- Dessert photo style generation.
- Instagram carousel copy.

## Local Bot Testing

Use a separate Telegram bot token for local testing. Run Next.js locally, expose `localhost:3000` with ngrok, and set the test bot webhook to:

```text
https://<ngrok-url>/api/telegram/webhook
```

Do not point the production bot token at ngrok unless intentionally moving production traffic to the local machine.
