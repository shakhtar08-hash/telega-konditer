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

## Follow-up fix pass

### Review gaps addressed

1. Replaced the raw JSON conditions textarea with a structured first-version conditions builder in [src/app/admin/triggers/trigger-form.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/trigger-form.tsx).
2. Made the right-side event/delay/conditions/message/image preview live while editing in the same form.

### Builder changes

- Added supported field choices only:
  - `Promo claimed`
  - `Active tariff`
  - `Generation count`
  - `Group ID`
- Added supported operator choices only:
  - `is`
  - `equals`
  - `is at least`
  - `contains`
- Enforced first-version guardrails in the UI:
  - `AND` only
  - no raw technical JSON input for admins
  - typed value controls per condition kind (`Yes/No`, number, text)
- Preserved the persistence contract by serializing the structured rows into the existing hidden `conditions` field for submit.

### Server-action hardening

- Tightened [src/app/admin/triggers/actions.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/actions.ts) so submitted `conditions` JSON is normalized against the supported condition model before Prisma writes.
- Unsupported fields/operators are now filtered out instead of being persisted.

### Live preview changes

- Converted the trigger form to a client component with local form state for:
  - event
  - delay value
  - delay unit
  - conditions
  - message text
  - image URL / chosen file preview
- The right-side summary and Telegram card now update before save as these values change.
- Local file selection now previews immediately via object URL without waiting for upload.

### Fresh test evidence

- Red verification for the follow-up fixes:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
  - Result before implementation: failed on unsupported-condition filtering, structured builder expectations, and readable condition summary expectations.
- Green verification after implementation:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
  - Result: `2` files passed, `7` tests passed.
- Focused regression coverage:
  - `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
  - Result: `3` files passed, `9` tests passed.
- Typing verification:
  - `npm run typecheck`
  - Result: passed.

### Follow-up status

- The two concrete review gaps are now addressed within the Task 5 owned files.
- Remaining concern from the earlier report about JSON-based condition authoring is resolved by this follow-up.

## Delay hardening follow-up

### Review gap addressed

- Hardened server-side delay parsing and normalization in [src/app/admin/triggers/actions.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/actions.ts).

### What changed

- Delay parsing now accepts only first-version supported units:
  - `now`
  - `minutes`
  - `hours`
  - `days`
- Unsupported `delayUnit` values now normalize to `now`.
- Negative `delayValue` submissions now clamp to `0`.
- Non-finite delay values still normalize to `0`.
- When the normalized unit is `now`, the persisted delay value is forced to `0`.

### Safety outcome

- Invalid delay submissions can no longer persist unsupported units that might break runtime scheduling.
- Negative delays can no longer persist values that would schedule messages into the past.
- This closes the remaining path that could have produced `Invalid Date` or past scheduling behavior from malformed admin submissions.

### Fresh test evidence

- Red verification for delay hardening:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts`
  - Result before implementation: failed on unsupported unit normalization and negative delay clamping expectations.
- Green verification after implementation:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts`
  - Result: `1` file passed, `6` tests passed.
- Focused regression coverage:
  - `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
  - Result: `3` files passed, `11` tests passed.
- Typing verification:
  - `npm run typecheck`
  - Result: passed.

## Upload side-effect hardening follow-up

### Review gap addressed

- Reordered required-field validation and image saving in [src/app/admin/triggers/actions.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/actions.ts) so invalid create/update submissions do not save uploaded trigger images first.

### What changed

- `createTriggerRule()` now validates required fields before calling `saveAdminImage()`.
- `updateTriggerRule()` now validates required fields before calling `saveAdminImage()`.
- This prevents invalid submissions from creating orphaned files under `public/uploads/admin/triggers`.

### Safety outcome

- Invalid create submissions with an uploaded image no longer trigger image persistence.
- Invalid update submissions with an uploaded image no longer trigger image persistence.
- Database writes, cache revalidation, and redirects remain skipped for these invalid submissions.

### Fresh test evidence

- Red verification for upload-side-effect hardening:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts`
  - Result before implementation: failed because invalid create/update submissions still called `saveAdminImage()`.
- Green verification after implementation:
  - `npm test -- src/app/admin/triggers/page.actions.test.ts`
  - Result: `1` file passed, `8` tests passed.
- Focused regression coverage:
  - `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
  - Result: `3` files passed, `13` tests passed.
- Typing verification:
  - `npm run typecheck`
  - Result: passed.

## Group ID draft safety follow-up

### Review gap addressed

- Fixed the default condition draft factory in [src/app/admin/triggers/trigger-form.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/trigger-form.tsx) so switching a row to `Group ID` no longer seeds the value with `"0"`.

### What changed

- Exported the condition draft factory for direct regression coverage.
- Text-based condition fields now initialize with a blank safe value.
- Numeric fields still initialize with `"0"` where that sentinel is intentional and valid.

### Safety outcome

- `Group ID` no longer silently starts as a never-matching numeric sentinel.
- A switched `Group ID` row now begins empty, which makes the state safer and more obvious before save.

### Fresh test evidence

- Red verification for Group ID draft safety:
  - `npm test -- src/app/admin/triggers/trigger-form.test.tsx`
  - Result before implementation: failed because `createDefaultConditionDraft("groupId")` was not exposed and the draft still seeded an unsafe text value path.
- Green verification after implementation:
  - `npm test -- src/app/admin/triggers/trigger-form.test.tsx`
  - Result: `1` file passed, `4` tests passed.
- Focused regression coverage:
  - `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
  - Result: `3` files passed, `14` tests passed.
- Typing verification:
  - `npm run typecheck`
  - Result: passed.
