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

## Follow-up fix after review
- Enforced bridge-only behavior for funnel on EU ingress by branching on `APP_ROLE === "ingress"` directly, so missing bridge configuration now throws instead of falling back to local Prisma for `/admin/funnel` reads or writes.
- Moved ingress mutation routing ahead of local image persistence so EU no longer runs `saveAdminImage(...)` for migrated funnel writes.
- Updated funnel bridge posting to forward raw `FormData` with the shared secret header, preserving file uploads for RU handling.
- Extended `src/app/api/internal/admin/funnel/actions/route.ts` to accept multipart form data, parse the funnel mutation on RU, and execute `saveAdminImage(...)` there before calling the funnel service.
- Adjusted tests to cover fail-closed ingress reads, fail-closed ingress writes, and RU-owned upload forwarding.
- Tightened `loadAdminFunnelPageData()` typing after the follow-up `npm run typecheck` surfaced an incorrect `Promise<FunnelAdminStep[]>` cast.

## Follow-up verification
- Regression red step before the fix:
  - `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx`
  - Result: FAIL in the expected ingress fallback and local-upload spots.
- Required verification after the fix:
  - `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/bot/onboarding.test.ts`
  - Result: PASS (3 files, 26 tests)
  - `npm run typecheck`
  - Result: PASS
