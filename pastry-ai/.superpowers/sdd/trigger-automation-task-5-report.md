# Task 5 Report: Add create/edit trigger pages and server actions

## Status

DONE_WITH_CONCERNS

## Scope completed

- Added real TriggerRule server actions in [src/app/admin/triggers/actions.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/actions.ts).
- Added the new trigger creation page in [src/app/admin/triggers/new/page.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/new/page.tsx).
- Added the trigger edit page in [src/app/admin/triggers/[triggerId]/page.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/[triggerId]/page.tsx).
- Added the reusable trigger form in [src/app/admin/triggers/trigger-form.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/trigger-form.tsx).
- Added form coverage in [src/app/admin/triggers/trigger-form.test.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/trigger-form.test.tsx).
- Replaced the legacy loud-fail action test with real TriggerRule action coverage in [src/app/admin/triggers/page.actions.test.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.actions.test.ts).

## What changed

### Server actions

- Implemented `createTriggerRule(formData)`.
- Implemented `updateTriggerRule(formData)`.
- Implemented `deleteTriggerRule(formData)`.
- Added shared parsing for:
  - `conditions` JSON
  - `delayValue` + `delayUnit`
  - edit-page `status`
- Wired image persistence through the existing shared `saveAdminImage()` helper with `entity: "triggers"`.
- Revalidate and redirect now target `/admin/triggers` for all three actions.

### Create/edit pages

- `/admin/triggers/new` now renders a real creation form.
- Template query prefills `name`, `eventKey`, `delayValue`, `delayUnit`, and `conditions`.
- `/admin/triggers/[triggerId]` now loads a real rule from Prisma and renders the edit form.
- Missing trigger IDs fail through `notFound()`.

### Form UI

- Built a reusable two-column layout:
  - left side: form fields and submit/delete controls
  - right side: schedule/condition summary plus Telegram-style message preview
- Reused existing admin primitives:
  - `AdminPanel`
  - `AdminField`
  - `AdminInput`
  - `AdminSelect`
  - `AdminTextarea`
  - `AdminImageField`

## TDD / verification notes

### Red

- Replaced the old Task 4 compatibility test with new tests that import `./actions` and `./trigger-form`.
- First sandboxed test run failed before execution because Vitest could not spawn its config dependency process.
- Re-ran the same targeted suite outside the sandbox and got the expected red result:
  - missing `src/app/admin/triggers/actions.ts`
  - missing `src/app/admin/triggers/trigger-form.tsx`

### Green

- Implemented the missing modules and reran the requested suites.
- Verified green on:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`

### Final verification

- Verified broader trigger coverage on:
  - `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
- Verified typing on:
  - `npm run typecheck`

## Minor adaptation from the brief

- The brief sketches a dedicated `ConditionsBuilder` UI that serializes conditions into a `conditions` field.
- In the current codebase, there was no existing trigger-specific client-side builder to reuse, and adding one would have expanded scope beyond the owned files and current test surface.
- I preserved the required persistence contract by using a JSON-backed `conditions` textarea that submits the exact `conditions` payload expected by the new server actions.
- This keeps Task 5 behavior correct while leaving room for a richer interactive builder later if desired.

## Concerns

- The form currently exposes trigger conditions as editable JSON rather than a structured row-based builder. Persistence and prefills work, but the authoring UX is more technical than the ideal sketched in the brief.

## Commits

- None created yet.
