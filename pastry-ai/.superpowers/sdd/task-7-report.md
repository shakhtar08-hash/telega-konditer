# Task 7: Admin tariffs page — Report

## Completed

### Files changed

1. **`src/app/admin/layout.tsx:25`** — Sidebar "Тарифы" link href changed from `/admin/users` to `/admin/tariffs`
2. **`src/app/admin/admin-pages.test.ts:12`** — Test updated to match new href
3. **`src/app/admin/tariffs/page.tsx`** (new) — Full CRUD admin page for TariffPlan

### Page features

- **Data listing**: All TariffPlans ordered by `sortOrder asc`, showing name, tokenAmount, durationDays, sortOrder, active (StatusBadge), createdAt
- **Create form** (top panel): slug, name, tokenAmount, durationDays, active toggle
- **Inline editor** (per row): name, tokenAmount, durationDays inputs, active toggle, save button
- **Toggle button** (per row): "Вкл" / "Выкл" to flip active state
- **Server actions**: `createTariff`, `updateTariff`, `toggleTariff`

### Verification

- `npm run test -- src/app/admin/` — all admin tests pass
- `npm run build` — fails only on pre-existing TS error in `src/bot/handlers/single-style-photoshoot.ts` (unrelated)
