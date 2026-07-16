# Task 4: Replace raw trigger `groupId` input with structured user-group conditions

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

- Modify: `src/features/triggers/trigger-rule-types.ts`
- Modify: `src/features/triggers/trigger-condition.ts`
- Modify: `src/app/admin/triggers/actions.ts`
- Modify: `src/app/admin/triggers/trigger-form.tsx`
- Modify: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/app/admin/triggers/page.actions.test.ts`
- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/page.test.tsx`

## Interfaces

- Consumes:
  - `UserGroup` records from Prisma
  - existing trigger form condition builder
- Produces:
  - `TriggerCondition` variant `{ field: "userGroupId"; operator: "isMember"; value: string }`
  - trigger form support for a real group select

## Required Work

1. Replace the old raw `groupId` / `contains` trigger condition shape with structured `userGroupId` / `isMember`.
2. Update condition evaluation to check `state.groupIds.includes(condition.value)`.
3. Update trigger form condition UI to use real group options, not freeform text.
4. Update trigger actions parsing/normalization to accept only the new condition shape.
5. Update trigger list summaries so group conditions resolve to business-friendly Russian labels.
6. Keep this task scoped to trigger condition typing, parsing, form rendering, and trigger list display.
7. Verify with:
   - `npm test -- src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx`
8. Commit with:
   - `feat: add structured user group trigger conditions`

## Implementation Notes

- You are not alone in the codebase. Do not revert unrelated changes and do not clean the working tree.
- Task 5 will handle broader Russian localization and explicit delete UX. In this task, only translate or adjust copy where it is directly required by the new group condition flow.
- You may need to load `UserGroup` rows into trigger pages so the form can render the select and the list can resolve names.
- Preserve current `AND` logic.
- Write the full report to:
  - `C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\manual-user-groups-task-4-report.md`
