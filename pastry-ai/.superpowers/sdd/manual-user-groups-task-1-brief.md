# Task 1: Add manual user-group persistence and runtime loading

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

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_manual_user_groups/migration.sql`
- Modify: `src/features/triggers/trigger-rule-types.ts`
- Modify: `src/features/triggers/trigger-user-state.ts`
- Create: `src/features/triggers/trigger-user-state.test.ts`

## Interfaces

- Consumes:
  - existing `User` Prisma model
  - existing `TriggerUserState` shape from `src/features/triggers/trigger-rule-types.ts`
- Produces:
  - Prisma models `UserGroup` and `UserGroupMember`
  - `TriggerUserState["groupIds"]` loaded from persisted memberships
  - `createTriggerUserStateLoader(deps)` returning `Promise<TriggerUserState>`

## Required Work

1. Add a failing loader test proving persisted `userGroupId` memberships flow into `groupIds`.
2. Update the Prisma schema with:
   - `UserGroup`
   - `UserGroupMember`
   - `User.groupMemberships`
3. Add a safe migration for those tables with cascading cleanup.
4. Extend `createTriggerUserStateLoader` with `findUserGroups(userId)` and map those rows into `groupIds`.
5. Verify with:
   - `npm test -- src/features/triggers/trigger-user-state.test.ts`
   - `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`
6. Commit with:
   - `feat: add manual user group persistence`

## Implementation Notes

- You are not alone in the codebase. Do not revert unrelated changes and do not clean the working tree.
- Keep your edits scoped to the files listed above.
- Follow existing patterns in `src/features/triggers/trigger-user-state.ts` and nearby trigger tests.
- There is existing dirty state across the repo; ignore unrelated files.
- Report exact changed files, commands run, test results, and commit SHA.

## Report Path

Write your full report to:

`C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\manual-user-groups-task-1-report.md`
