# Task 5: Translate touched trigger screens to Russian, wire live group options, and make delete flow explicit

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

- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/new/page.tsx`
- Modify: `src/app/admin/triggers/[triggerId]/page.tsx`
- Modify: `src/app/admin/triggers/trigger-form.tsx`
- Modify: `src/app/admin/triggers/page.test.tsx`
- Modify: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/components/admin/chat-bot-subnav.tsx`

## Interfaces

- Consumes:
  - existing trigger screens and `deleteTriggerRule`
  - Task 4 support for `userGroupOptions` in `TriggerForm`
- Produces:
  - Russian-facing trigger UI on touched screens
  - live `UserGroup` option wiring into trigger create/edit screens
  - explicit supported delete flow on trigger edit

## Required Work

1. Load real `UserGroup` rows in trigger list and create/edit route entry points, then pass them into `TriggerForm` as `userGroupOptions`.
2. Translate touched trigger UI copy to Russian:
   - page titles
   - filter labels
   - helper text
   - condition labels
   - empty states
   - action buttons
3. Make delete flow explicit and clearly visible on the edit page.
4. Keep write scope limited to the files listed above.
5. Verify with:
   - `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/trigger-form.test.tsx`
6. Commit with:
   - `feat: localize trigger admin to Russian`

## Implementation Notes

- You are not alone in the codebase. Do not revert unrelated changes and do not clean the working tree.
- Task 4 already landed the structured `userGroupId` condition but could not wire route files due to scope. This task must finish that wiring.
- Prefer Russian business-facing copy throughout the touched trigger screens.
- Keep delete support on the edit screen explicit even if list-level delete remains secondary.
- Write the full report to:
  - `C:\Users\Roof\Documents\Телега\pastry-ai\.superpowers\sdd\manual-user-groups-task-5-report.md`
