# Task 8: Admin users page extension — Report

## Changes made

Modified `src/app/admin/users/page.tsx`:

1. **Updated Prisma query** — added `userTariff` with select for `remainingTokens`, `expiresAt`, and `tariffPlan.name`
2. **Added `updateUserTokens` server action** — accepts `id` and `tokens` from a form, updates `userTariff.remainingTokens`, revalidates `/admin/users`
3. **Added three new DataTable columns** after `credits`:
   - **Тариф** — displays `userTariff.tariffPlan.name` or "—"
   - **Токены** — editable inline form with number input + OK button
   - **Истекает** — formatted date or "—"
4. **Removed duplicate "Текущий уровень" column** — it showed the same data as the "Уровень" column

## Build status

`npm run build` **fails**, but only due to a **pre-existing type error** in `src/bot/handlers/single-style-photoshoot.ts:20` (unrelated to this task). No new errors were introduced.