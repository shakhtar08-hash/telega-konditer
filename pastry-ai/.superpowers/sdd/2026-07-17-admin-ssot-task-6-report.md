# Task 6 Report: Migrate Settings and Dashboard/Reporting Reads

## Scope completed

- Added RU-backed admin bridge services for settings and dashboard/reporting:
  - `src/features/admin/settings/service.ts`
  - `src/features/admin/settings/internal-admin-client.ts`
  - `src/features/admin/dashboard/service.ts`
  - `src/features/admin/dashboard/internal-admin-client.ts`
- Added internal admin bridge ingress endpoints:
  - `src/app/api/internal/admin/settings/route.ts`
  - `src/app/api/internal/admin/settings/actions/route.ts`
  - `src/app/api/internal/admin/dashboard/route.ts`
- Switched ingress reads to the RU-backed bridge for:
  - `src/app/admin/settings/page.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/admin/history/page.tsx`
  - `src/app/admin/usage/page.tsx`
- Switched settings secret mutations to the RU-backed bridge on ingress while keeping direct local service calls for non-ingress runtime.
- Added/updated Task 6 ingress coverage:
  - `src/app/admin/settings/page.test.tsx`
  - `src/app/admin/page.test.tsx`

## Behavior changes

- `AdminSettingsPage` now loads stored secret previews and DB status from RU when `APP_ROLE=ingress`.
- Settings secret save/clear server actions now post to `/api/internal/admin/settings/actions` on ingress and no longer mutate local Prisma directly there.
- `AdminDashboardPage`, `AdminHistoryPage`, and `AdminUsagePage` now read through the RU-backed internal admin bridge on ingress.
- Local runtime behavior remains service-backed through Prisma for non-ingress execution.
- For migrated Task 6 ingress paths, bridge calls are attempted directly on ingress rather than silently falling back to local Prisma.

## Verification

- Red/green Task 6 tests:
  - `npm run test -- src/app/admin/settings/page.test.tsx src/app/admin/page.test.tsx`
  - Result: PASS
- Full typecheck:
  - `npm run typecheck`
  - Result: FAIL, but only due to a pre-existing/out-of-scope error in `src/app/admin/dynamic-user-groups/[groupId]/page.tsx:66`

## Concerns

- Repository-wide typecheck is still blocked by an unrelated existing `dynamic-user-groups` typing issue outside Task 6 ownership.
- I did not add dedicated history/usage route tests in this batch; the migrated bridge path is covered through implementation and the focused page tests above.
