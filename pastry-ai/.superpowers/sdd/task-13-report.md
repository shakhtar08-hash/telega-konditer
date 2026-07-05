# Task 13: Payment webhook — tariff assignment

## Status: ✅ Done

## Changes

**File:** `src/app/api/payments/cloudpayments/route.ts`

1. **Lines 41-44:** Added lookup of `pastry-chef` tariff plan via `prisma.tariffPlan.findUnique`
2. **Lines 46-79:** Replaced old transaction block (subscription.upsert + user.update) with:
   - `payment.upsert` (kept)
   - `userTariff.upsert` (new) — sets `tariffPlanId`, `remainingTokens`, `startedAt`, `expiresAt`
3. **Line 83:** User query now only selects `telegramId`
4. **Line 106:** Trigger call passes `"PRO"` as string literal instead of `user.plan`
5. **Removed:** `getNextMonth()` helper function (no longer used)

## Verification

- `npm run typecheck` — ✅ passes
