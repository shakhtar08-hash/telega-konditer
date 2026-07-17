## Task

Task 1: Establish Shared Bridge Primitive and Inventory Gate

## Scope Completed

- Added shared admin bridge primitive at `src/features/admin/shared/internal-admin-client.ts`.
- Added shared bridge tests at `src/features/admin/shared/internal-admin-client.test.ts`, including coverage for normalized `Headers` input and caller-header preservation.
- Refactored `src/features/admin/users/internal-admin-client.ts` to consume and re-export the shared primitive so the users bridge remains the reference consumer and existing users page/action imports stay compatible.
- Updated Task 1 checklist progress in `docs/superpowers/plans/2026-07-17-admin-single-source-of-truth-implementation-plan.md`, which was part of the briefed write scope.

## TDD Evidence

1. Added `src/features/admin/shared/internal-admin-client.test.ts`.
2. Ran `npm run test -- src/features/admin/shared/internal-admin-client.test.ts`.
3. Observed expected red state: module import failure for `./internal-admin-client`.
4. Implemented the shared primitive and refactored the users bridge.
5. Re-ran the shared test and the focused users regression suite.
6. Added a follow-up failing test for `headers: new Headers(...)` to reproduce the reviewer finding.
7. Observed the expected red state: the bridge passed a plain object to `fetch`, so `Headers` behavior was lost.
8. Updated the shared primitive to normalize headers with `new Headers(init?.headers)` and then set the shared-secret and `content-type` headers.
9. Adjusted the original assertion to inspect normalized headers directly and re-ran the focused Task 1 verification suite.

## Verification Run

- `npm run test -- src/features/admin/shared/internal-admin-client.test.ts`
  - Initial red state for follow-up fix: 1 failed test, `headers.get is not a function`
  - Final PASS: 1 file, 3 tests
- `npm run test -- src/app/admin/users/user-groups-actions.test.ts src/app/admin/users/page.test.tsx src/app/admin/users/[userId]/page.test.tsx`
  - Initial run exposed a compatibility miss: `shouldUseInternalAdminBridge` was no longer re-exported from the users bridge.
  - Added the re-export in `src/features/admin/users/internal-admin-client.ts`.
  - PASS on rerun: 3 files, 6 tests

## Notes

- I did not modify other admin domains.
- I avoided reverting unrelated working tree changes and stayed within the requested Task 1 write scope.
- I created the scoped Task 1 commit after verification.

## Concerns

- No additional concerns in Task 1 scope after the follow-up fix.

## Follow-up Fix 2

Date: 2026-07-17

### Issue

- `src/features/admin/users/internal-admin-client.ts` re-exported `fetchInternalAdminJson` for consumers, but did not import it for local wrapper usage.
- The wrapper methods therefore referenced an undefined identifier during compilation.

### Root Cause

- Re-export syntax alone does not create a local binding in the module body.
- The shared helper remained part of the public compatibility surface, but the local wrapper functions needed a real import.

### Fix Applied

- Added a local import of `fetchInternalAdminJson` and `shouldUseInternalAdminBridge` from `@/features/admin/shared/internal-admin-client`.
- Preserved the existing public compatibility surface by keeping the explicit re-export from the same shared module.

### Verification

- `npm run test -- src/features/admin/shared/internal-admin-client.test.ts`
  - PASS: 1 file, 3 tests
- `npm run test -- src/app/admin/users/user-groups-actions.test.ts src/app/admin/users/page.test.tsx src/app/admin/users/[userId]/page.test.tsx`
  - PASS: 3 files, 6 tests
- `npm run typecheck`
  - PASS

### Notes

- Scope remained limited to the Task 1 users bridge compatibility fix plus this report update.
