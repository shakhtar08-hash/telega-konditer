# Tariff & Token Access System

> Date: 2026-07-05
> Status: Design — approved, awaiting implementation

## Overview

Replace FREE/PRO/TEAM plan model with editable tariff plans and token-based access to image generation. Text responses remain free. Each successfully sent image costs 1 token.

## Schema

### New Models

**TariffPlan** — editable tariff definition.

| Field | Type | Notes |
|---|---|---|
| `id` | String, @id, cuid | |
| `slug` | String, @unique | e.g. `promo`, `pastry-chef` |
| `name` | String | e.g. `Промо` |
| `tokenAmount` | Int | |
| `durationDays` | Int | |
| `active` | Boolean | default `true` |
| `sortOrder` | Int | |
| timestamps | DateTime | `createdAt`, `updatedAt` |

**UserTariff** — user's active tariff and token balance.

| Field | Type | Notes |
|---|---|---|
| `id` | String, @id, cuid | |
| `userId` | String, @unique, FK → User | |
| `tariffPlanId` | String, FK → TariffPlan | |
| `remainingTokens` | Int | default 0 |
| `startedAt` | DateTime | |
| `expiresAt` | DateTime | |
| timestamps | DateTime | `createdAt`, `updatedAt` |

Relations: `UserTariff.user` (required), `UserTariff.tariffPlan` (required).

**TokenUsage** — audit log for image token consumption.

| Field | Type | Notes |
|---|---|---|
| `id` | String, @id, cuid | |
| `userId` | String, FK → User | |
| `feature` | String | e.g. `photoshoot`, `recipes` |
| `promptSlug` | String? | nullable |
| `imagesSent` | Int | |
| `tokensSpent` | Int | |
| `createdAt` | DateTime | |

Index: `@@index([userId, createdAt])`

### Changes to User

- `plan` (Plan enum) — kept as legacy field, not used in business logic
- `credits` — kept as legacy field. On migration: `credits` → `UserTariff.remainingTokens` for existing users who get a tariff

### Seed Tariffs

| Slug | Name | Tokens | Days | Sort |
|---|---|---|---|---|
| `promo` | Промо | 15 | 3 | 1 |
| `pastry-chef` | Кондитер | 100 | 30 | 2 |
| `master` | Мастер | 200 | 30 | 3 |
| `head-chef` | Шеф-кондитер | 400 | 30 | 4 |

## Migration

Existing users:
1. If user has `credits > 0`, they receive a one-time `UserTariff` with `tariffPlanId = promo`, `remainingTokens = credits`, `expiresAt = now + 3 days`.
2. If user has `credits === 0`, they receive `UserTariff` with `promo`, `remainingTokens = 15`, `expiresAt = now + 3 days`.
3. If user has an active `Subscription` with `status=active`, `expiresAt` is carried over (the tariff expiry is extended up to the subscription expiry).

After migration, product logic does not read `User.plan` or `User.credits`.

## Core Services

### TokenGuardService

Central service for token checking and charging.

```
ensureSufficientTokens(userId, required: number): Promise<void>
  → throws UserFacingError if tariff expired or not enough tokens

getAvailablePhotoSlots(userId, maxSlots: number): Promise<number>
  → returns min(maxSlots, remainingTokens), or 0 if expired

chargeTokens(userId, feature, promptSlug?, imagesSent: number): Promise<void>
  → decrements remainingTokens, writes TokenUsage
  → called AFTER successful send

getUserTariffState(userId): Promise<TariffState | null>
  → { tariffName, remainingTokens, expiresAt }
```

### RecipeAgent — structured output

`RecipeOutput` changes from `string` to:

```typescript
export type RecipeOutput = {
  text: string;
  dishes: Array<{ name: string; description: string }>;
};
```

Recipe uses `generateObject` with zod schema. Prompt gets instruction: return up to 4 dishes with name + description detailed enough for text-to-image generation.

### Recipe Flow (updated)

1. RecipeAgent returns `{ text, dishes }`
2. Send text as before
3. `slots = getAvailablePhotoSlots(userId, dishes.length)` — returns 0-4
4. For each of the first `slots` dishes: `aiService.generateImage(provider: openrouter, model: flux)` with description-based prompt
5. After each successful send: `chargeTokens(userId, "recipes", slug, 1)`
6. If slots === 0: append `⚠️ Фото-примеры не приложены...` message to text

### Photoshoot Flow (updated)

1. Before agent: `ensureSufficientTokens(userId, styles.length)`
2. If insufficient → reply with limit message, return
3. After each image sent: `chargeTokens(userId, "photoshoot", "product-photo", 1)`

### Single-style Photoshoot (updated)

Same as photoshoot but with `styles.length === 1`. `ensureSufficientTokens(userId, 1)`.

## Bot Messages

| Case | Message (Russian) |
|---|---|
| No tokens (image flow) | `У вас закончились токены на генерацию фото. Чтобы продолжить, купите тариф в /menu.` |
| Tariff expired | `Срок действия вашего тарифа истёк. Доступ к генерации фото заблокирован. Купите новый тариф в /menu.` |
| Insufficient for batch | `Для этого сценария нужно ${required} токенов. У вас осталось ${remaining}. Купите тариф с бóльшим количеством токенов.` |
| Recipe: text sent, no photos | `\n\n⚠️ Фото-примеры не приложены — у вас закончились токены. Чтобы получать фото, купите тариф в /menu.` |

## Admin UI

### `/admin/tariffs` — new page

- Table: name, slug, tokens, duration, active, sort order
- Inline editing (pattern from `/admin/photo-styles`)
- Server actions: `updateTariff`, `createTariff`, `toggleTariff`

### `/admin/users` — extended

- New columns: tariff name, remaining tokens, expires at
- Form to manually set tokens (server action `updateUserTokens`)
- Tariff field visually labels the current plan

## Payment

CloudPayments webhook: after successful payment, receive `tariffSlug` in metadata. Upsert `UserTariff` — full replacement of old tariff.

## Token Charging Rules

- **Always**: charge AFTER successful `ctx.replyWithPhoto()` — not before generation
- **Photoshoot (7 images)**: check all 7 before any generation; fail early if insufficient
- **Single-style (1 image)**: check 1
- **Recipe (0-4 images)**: check available slots after text is sent; send up to available
- **Text**: never charged
- **Failed generation**: never charged

## Acceptance Criteria

- A. Tariff CRUD in admin works
- B. User page shows tariff/tokens/expiry, admin can edit tokens
- C. Purchase assigns new tariff, replaces old one completely
- D. Batch photoshoot: if insufficient tokens for all → none sent, message shown
- E. Recipe: text always sent; up to min(dishes.length, remainingTokens, 4) photos
- F. Expired tariff → images blocked
- G. No token charge for text or failed sends

## Delivery Order

1. Prisma schema + migration
2. Migration script for existing users
3. TariffPlan repository + seed
4. UserTariff repository
5. TokenUsage model + repository
6. TokenGuardService
7. Admin: tariffs page
8. Admin: users page extension
9. RecipeAgent structured output + prompt update
10. Recipe handler: photo generation + token charging
11. Photoshoot handler: token guard
12. Single-style handler: token guard
13. Payment webhook: tariff assignment
14. Tests
15. Update docs