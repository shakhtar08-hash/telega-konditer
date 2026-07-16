# Task 3: Add dedicated user detail page with group membership editing

Plan: `docs/superpowers/plans/2026-07-13-manual-user-groups.md`

## Global Constraints

- manual user groups are managed explicitly by admins
- system segments such as active tariff, promo received, and generation count remain separate trigger conditions
- keep the `admin/triggers` interface fully in Russian
- make deleting existing triggers an explicit supported admin action
- no dynamic or rule-based groups in the first version
- no auto-sync from system segments into manual groups
- no bulk assignment in the first version
- no negative group condition such as `User is not in group`
- no multi-group operators such as any-of, all-of, or none-of
- no redesign of onboarding around groups

## Files

- Create: `src/app/admin/users/[userId]/page.tsx`
- Create: `src/app/admin/users/[userId]/page.test.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/users/actions.ts`
- Create: `src/app/admin/users/user-groups-actions.test.ts`

## Interfaces

- Consumes:
  - `addUserToGroup`, `removeUserFromGroup` from `src/app/admin/user-groups/actions.ts`
  - existing tariff editing flow in `src/app/admin/users/page.tsx`
- Produces:
  - user detail route `/admin/users/[userId]`
  - list-page navigation into the detail route

## Required Work

1. Add tests first for the new user detail page and membership editing behavior.
2. Build `/admin/users/[userId]` around:
   - user identity
   - current tariff state
   - current memberships
   - add/remove group actions
3. Keep `/admin/users` as the browsing table and add an `Открыть` entry point into the detail route.
4. Reuse Task 2 group actions; do not re-implement duplicate membership logic.
5. Verify with:
   - `npm test -- src/app/admin/users/[userId]/page.test.tsx src/app/admin/users/user-groups-actions.test.ts`
6. Commit with:
   - `feat: add user detail group editor`

## Implementation Notes

- You are not alone in the codebase. Do not revert unrelated changes and do not clean the working tree.
- Task 2 owns `/admin/user-groups`; this task owns only the files listed above.
- Keep the existing tariff editing workflow intact.
- Prefer Russian UI copy.
- Write the full report to:
  - `C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\manual-user-groups-task-3-report.md`
