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

- `User` - Telegram users, plan, credits, payments, subscription. `plan` (FREE/PRO/TEAM) and `credits` are legacy fields; new business logic uses `UserTariff` and `TariffPlan`.
- `TariffPlan` - editable tariff plans defining token amounts and duration.
- `UserTariff` - user's active tariff, remaining token balance, and expiry.
- `TokenUsage` - audit log for image token consumption per feature.
- `Subscription` - legacy access status (replaced by `UserTariff`).
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
- `TriggerMessage` - automatic scheduled message templates.
- `ScheduledMessage` - queued messages to be sent by cron trigger processor.

## Tariff Plans

`TariffPlan` defines editable tariff plans:

| Field | Type | Notes |
|---|---|---|
| `id` | String, cuid | |
| `slug` | String, unique | e.g. `promo`, `pastry-chef` |
| `name` | String | e.g. `Промо` |
| `tokenAmount` | Int | Number of tokens included |
| `durationDays` | Int | Validity period in days |
| `active` | Boolean | Toggle visibility |
| `sortOrder` | Int | Display order |

Seed creates 4 tariffs: Промо (15/3д), Кондитер (100/30д), Мастер (200/30д), Шеф-кондитер (400/30д).

## User Tariff State

`UserTariff` stores each user's active tariff:

| Field | Type | Notes |
|---|---|---|
| `userId` | String, unique, FK→User | One tariff per user |
| `tariffPlanId` | String, FK→TariffPlan | |
| `remainingTokens` | Int | Decremented on image send |
| `startedAt` | DateTime | |
| `expiresAt` | DateTime | After this, tokens are invalid |

A new purchase fully replaces the old tariff (tokens and expiry).

## Token Usage

`TokenUsage` logs each token charge:

| Field | Type | Notes |
|---|---|---|
| `userId` | String, FK→User | |
| `feature` | String | `photoshoot`, `recipes` |
| `promptSlug` | String? | Nullable |
| `imagesSent` | Int | |
| `tokensSpent` | Int | Always equals imagesSent (1 token per image) |

## Plans (Legacy)

The `Plan` enum (FREE/PRO/TEAM) is legacy. Product logic no longer reads it.

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

`npm run seed` creates if empty:

- 8 prompt records.
- 7 photo styles.
- 6 bot menu buttons.
- 5 funnel steps.
- 4 tariff plans.

Seed intentionally does not contain secrets.

## Shared Database Caveat

Localhost and deployed server can point to the same Supabase project. If both use the same `DATABASE_URL`, admin edits in one environment are visible in the other. This is expected shared-database behavior, not a sync bug.
