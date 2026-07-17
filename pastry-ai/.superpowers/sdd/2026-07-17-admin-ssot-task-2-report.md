# Task 2 Report: Migrate Funnel and Onboarding Admin to RU

Date: 2026-07-17
Status: DONE

## Scope delivered
- Added a dedicated funnel admin service at `src/features/admin/funnel/service.ts` for local Prisma reads and mutations.
- Added a funnel internal bridge client at `src/features/admin/funnel/internal-admin-client.ts` using the shared Task 1 admin bridge primitives.
- Added authenticated internal RU endpoints:
  - `src/app/api/internal/admin/funnel/route.ts`
  - `src/app/api/internal/admin/funnel/actions/route.ts`
- Switched `src/app/admin/funnel/page.tsx` so ingress reads and writes funnel data through RU, while non-ingress/local paths continue to use direct local service calls.
- Updated funnel page and action tests to cover ingress bridge reads and mutations without disturbing unrelated working-tree edits.

## Implementation notes
- `loadAdminFunnelPageData()` now owns the funnel page query shape and returns `{ steps }` for both local and bridged callers.
- `performCreateFunnelStep()` and `performUpdateFunnelStep()` centralize Prisma writes, including legacy `buyButtonText` / `buyButtonUrl` derivation from the first active buy button.
- The page now parses form data once, resolves images through `saveAdminImage`, and then chooses between:
  - `postInternalAdminFunnelAction(...)` on ingress
  - `performCreateFunnelStep(...)` / `performUpdateFunnelStep(...)` otherwise
- `AdminFunnelPage()` now uses:
  - `fetchInternalAdminFunnelPageData()` on ingress
  - `loadAdminFunnelPageData()` otherwise
- The internal API routes follow the same secret-validated pattern established in Task 1 users bridging.

## Verification
- Red step verified first:
  - `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx`
  - Observed expected failures proving ingress still used local Prisma before implementation.
- Green verification after implementation:
  - `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx`
  - Result: PASS
- Final required verification:
  - `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/bot/onboarding.test.ts`
  - Result: PASS (3 files, 23 tests)

## Files changed
- `src/features/admin/funnel/service.ts`
- `src/features/admin/funnel/internal-admin-client.ts`
- `src/app/api/internal/admin/funnel/route.ts`
- `src/app/api/internal/admin/funnel/actions/route.ts`
- `src/app/admin/funnel/page.tsx`
- `src/app/admin/funnel/page.actions.test.ts`
- `src/app/admin/funnel/page.test.tsx`

## Git
- Commit created: `feat: bridge funnel admin to ru runtime`

## Concerns
- None.
