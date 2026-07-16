# RU/EU Migration Phase C Report

> Phase C only. This was a staging migration rehearsal. Production remained on the current EU + Supabase setup.

**Date:** 2026-07-16

## Goal of Phase C

Take the first logical dump from the current production Supabase-backed database, restore it into RU staging, and verify that the restored application schema and representative data match.

## What Was Done

### 1. Source dump

- Confirmed that the RU host can reach the current production PostgreSQL endpoint used by the live application.
- Extracted the current production database URL from the running EU production application container without printing it into chat.
- Created a logical dump of the **`public` schema** from the current production database.

Dump artifact created on RU:

- `/srv/pastry-ai/backups/postgres/supabase-public-2026-07-16-170229.dump`

Notes:

- The dump intentionally targeted `public` only.
- This matches the current application reality discovered in Phase A:
  - business data lives in `public`
  - Supabase platform schemas (`auth`, `storage`, `realtime`) still exist in production but are not used by the app runtime as the primary source of business logic

### 2. Staging restore on RU

- Dropped any previous `pastry_ai_staging` database if present.
- Created a fresh `pastry_ai_staging` database on RU.
- Restored the custom-format dump into `pastry_ai_staging`.

### 3. Staging access preparation

- Changed the staging database owner to `pastry_app`.
- Granted `pastry_app` access to:
  - connect to `pastry_ai_staging`
  - use/create in schema `public`
  - all current tables and sequences in `public`
  - default privileges for future tables/sequences in `public`

## Verification Results

### Staging database exists

- Restored RU staging database present:
  - `pastry_ai_staging`

### Application-user connectivity

- Verified that `pastry_app` can connect to `pastry_ai_staging`.
- Verified query result using app credentials:
  - database: `pastry_ai_staging`
  - user: `pastry_app`
  - `User` row count: `4`

### Public schema table inventory

The restored `public` schema contains 24 tables:

- `ApiSecret`
- `BotMenuButton`
- `BotTextBlock`
- `CarouselTemplate`
- `Conversation`
- `DynamicUserGroup`
- `FunnelStep`
- `GeneratedRecipeContext`
- `Message`
- `Payment`
- `PhotoStyle`
- `Prompt`
- `ScheduledMessage`
- `Subscription`
- `TariffPlan`
- `TelegramSession`
- `TokenUsage`
- `TriggerRule`
- `Usage`
- `User`
- `UserGroup`
- `UserGroupMember`
- `UserTariff`
- `_prisma_migrations`

### Representative source vs target row counts

The following key table counts matched between source production `public` schema and RU staging:

- `Conversation` → `6`
- `GeneratedRecipeContext` → `9`
- `Message` → `12`
- `Payment` → `0`
- `ScheduledMessage` → `4`
- `TelegramSession` → `979`
- `TokenUsage` → `29`
- `TriggerRule` → `7`
- `Usage` → `0`
- `User` → `4`

## What This Confirms

1. The current business-critical application data can be dumped from the live Supabase-backed production database.
2. A RU PostgreSQL 17 server can restore the application-owned `public` schema successfully.
3. The restored staging database is queryable both as `postgres` and through the application role `pastry_app`.
4. The current Prisma-owned application schema appears portable off Supabase when scoped to `public`.

## What Was Intentionally Not Done Yet

- No production cutover
- No dump of Supabase platform schemas into RU application staging
- No webhook rerouting
- No AI gateway deployment
- No RU application deployment against staging yet
- No disabling of the current EU production app
- No secret rotation yet

## Important Observations

### 1. This was a `public` schema migration rehearsal

Phase C successfully validated the application-owned data path. It did **not** attempt to recreate Supabase platform internals (`auth`, `storage`, `realtime`) on RU.

That is consistent with the current repo and runtime audit, but it should remain explicit in all future migration steps.

### 2. The dump artifact is now on the RU host

The first migration rehearsal dump now exists on RU and should be treated as sensitive production data.

### 3. Backup offloading is still pending

The RU host now contains:

- local PostgreSQL backups
- the first production staging dump

An off-host RU backup destination is still needed before production cutover.

## Recommended Next Step

Proceed to **Phase D** only after approval:

- update the codebase to remove mandatory Supabase runtime coupling
- prepare RU-targeted runtime env handling
- introduce gateway-friendly internal endpoints
- add AI request sanitization boundary
- prepare deployable RU application artifacts
- validate the code against RU staging data

## Production Impact

- Production application on EU remained active
- Production Supabase database remained the source of truth
- No production traffic was switched
