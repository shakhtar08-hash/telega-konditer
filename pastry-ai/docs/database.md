# Database

The database is Supabase Postgres accessed through Prisma.

## Prisma

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.mjs`
- Prisma config: `prisma.config.ts`

After schema changes:

```bash
npx prisma generate
npx prisma migrate dev
```

For applying existing migrations to a deployed database:

```bash
npx prisma migrate deploy
```

## Core Models

- `User` - Telegram users, plan, credits, payments, subscription.
- `Subscription` - access status and optional expiry.
- `Payment` - CloudPayments/payment records.
- `Conversation` and `Message` - dialog history.
- `Usage` - feature usage, token counts, cost, latency.
- `Prompt` - editable prompt records for AI features.
- `BotMenuButton` - dynamic Telegram menu buttons.
- `TelegramSession` - persistent grammY session records and Telegram `update_id` claim records used to deduplicate webhook retries.
- `PhotoStyle` - style descriptions used by dessert photo generation.
- `CarouselTemplate` - templates for carousel content.
- `FunnelStep` - onboarding/funnel messages, images, and buttons.
- `ApiSecret` - encrypted managed API keys.

## Plans

The `Plan` enum currently has:

- `FREE` - no subscription.
- `PRO` - basic paid level.
- `TEAM` - advanced paid level.

Russian labels live in `src/features/subscriptions/plans.ts`.

## Bot Menu Buttons

`BotMenuButton` controls the main Telegram menu for users with access.

Fields:

- `label`, `emoji`, `description` - admin-editable text.
- `actionType` - `PROMPT` or `URL`.
- `promptFeature`, `promptSlug` - target prompt when `actionType = PROMPT`.
- `url` - target URL when `actionType = URL`.
- `sortOrder`, `active` - order and visibility.

Seed creates six default buttons: create recipe, create photo, dessert analysis, carousel, profile, bonuses.

## Telegram Sessions

`TelegramSession` is a generic key-value table used by bot infrastructure:

- grammY session keys store current scenario state, such as `lastFeature`, `lastPromptSlug`, and recipe follow-up context.
- `telegram-update:<update_id>` keys mark Telegram webhook updates as claimed before handlers run.

The update claim records are intentionally written before AI work starts. If Telegram retries an update after a timeout, the duplicate request returns `200 OK` without repeating the AI call.

## Seed Behavior

`npm run seed` upserts/updates:

- 4 prompt records.
- 7 photo styles.
- 6 bot menu buttons.
- 5 funnel steps.

Seed intentionally does not contain secrets.

## Shared Database Caveat

Localhost and deployed server can point to the same Supabase project. If both use the same `DATABASE_URL`, admin edits in one environment are visible in the other. This is expected shared-database behavior, not a sync bug.
