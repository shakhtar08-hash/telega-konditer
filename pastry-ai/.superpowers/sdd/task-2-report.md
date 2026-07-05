# Task 2 Report: Migration script for existing users

## What was implemented
Created `prisma/migrate-legacy-users.mjs` — a one-shot migration script for existing users.

- Reads the "promo" TariffPlan
- Iterates all users; skips those already having a UserTariff
- If `credits > 0`: `remainingTokens = credits`, `expiresAt = now + 3 days`
- If `credits === 0`: `remainingTokens = 15`, `expiresAt = now + 3 days`

## Files changed
- Created: `prisma/migrate-legacy-users.mjs`

## Self-review findings
- Syntax check passed (`node --check` exits clean)
- Script matches the brief exactly
- Uses `@prisma/adapter-pg` (same pattern as `seed-tariffs.mjs`)
- Handles missing "promo" plan with clear error message
- Uses `process.exit(1)` on failure as is standard in Prisma scripts

## Concerns
- None. Script is straightforward and follows existing patterns.