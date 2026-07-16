# Task 2: Add user-group admin routes and server actions

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

- Create: `src/app/admin/user-groups/actions.ts`
- Create: `src/app/admin/user-groups/page.tsx`
- Create: `src/app/admin/user-groups/page.test.tsx`
- Create: `src/app/admin/user-groups/[groupId]/page.tsx`
- Create: `src/app/admin/user-groups/[groupId]/page.test.tsx`
- Create: `src/app/admin/user-groups/group-membership-actions.test.ts`
- Modify: admin sidebar source used for navigation (currently `src/app/admin/sidebar.tsx`; update related sidebar tests if needed)

## Interfaces

- Consumes:
  - `prisma.userGroup`
  - `prisma.userGroupMember`
  - `prisma.user`
- Produces:
  - `createUserGroup(formData: FormData): Promise<void>`
  - `updateUserGroup(formData: FormData): Promise<void>`
  - `deleteUserGroup(formData: FormData): Promise<void>`
  - `addUserToGroup(formData: FormData): Promise<void>`
  - `removeUserFromGroup(formData: FormData): Promise<void>`

## Required Work

1. Add tests first for membership actions and for both new pages.
2. Build the new `/admin/user-groups` list page with create/open/delete affordances.
3. Build `/admin/user-groups/[groupId]` with:
   - group header
   - current members list
   - search field for users
   - add/remove membership actions
4. Add the new sidebar entry for `Группы пользователей`.
5. Keep write scope only to the files above plus any directly required sidebar test.
6. Verify with:
   - `npm test -- src/app/admin/user-groups/page.test.tsx src/app/admin/user-groups/[groupId]/page.test.tsx src/app/admin/user-groups/group-membership-actions.test.ts`
7. Commit with:
   - `feat: add admin user group management`

## Implementation Notes

- You are not alone in the codebase. Do not revert unrelated changes and do not clean the working tree.
- Task 1 already introduced the `UserGroup` / `UserGroupMember` schema and runtime loading. Build on that existing shape.
- Do not touch `/admin/users/[userId]` yet; that belongs to the next task.
- Follow existing `AdminPageHeader`, `DataTable`, and sidebar patterns.
- Prefer Russian UI copy for the new admin pages.
- Write the full report to:
  - `C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\manual-user-groups-task-2-report.md`

## Report Contract

In your final reply, return only:

- status
- commit SHA
- tests run with outcomes
- concerns
- list of changed files
