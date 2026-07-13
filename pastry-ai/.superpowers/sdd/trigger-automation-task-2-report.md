# Task 2 Report: Trigger rule domain and condition evaluation service

## Status

DONE_WITH_CONCERNS

## Scope completed

Updated only the Task 2 files:

- `src/features/triggers/trigger-rule-types.ts`
- `src/features/triggers/trigger-condition.ts`
- `src/features/triggers/trigger-service.ts`
- `src/features/triggers/trigger-service.test.ts`

## What changed

### 1. Added explicit trigger rule domain types

Created `trigger-rule-types.ts` with the Task 2 runtime domain:

- `TriggerCondition`
- `TriggerUserState`
- `TriggerRuleRecord`

The allowed condition fields and operators match the brief:

- `promoClaimed` + `is`
- `hasActiveTariff` + `is`
- `generationCount` + `equals | gte`
- `groupId` + `contains`

### 2. Added condition evaluation and delay helpers

Created `trigger-condition.ts` with:

- `evaluateConditions(conditions, state)`
- `computeSendAt(triggeredAt, delayValue, delayUnit)`

Behavior implemented:

- Multiple conditions are evaluated with `AND`
- `generationCount` supports `equals` and `gte`
- `groupId` checks membership in `state.groupIds`
- delay units support `now`, `minutes`, `hours`, and `days`

### 3. Refactored the trigger service to rule-based scheduling

Updated `trigger-service.ts` so `scheduleTrigger` now accepts:

`scheduleTrigger(eventKey, chatId, state, eventOccurredAt?)`

And now:

- loads active rules through `findActiveRulesByEvent(eventKey)`
- evaluates rule conditions against `TriggerUserState`
- skips non-matching rules
- deduplicates using `triggerRuleId + chatId + eventOccurredAt`
- enqueues scheduled rows with:
  - `triggerRuleId`
  - `triggerEventKey`
  - `text`
  - `imageUrl`
  - `buttons`
  - `triggeredAt`
  - computed `sendAt`

This removes the Task 2 runtime dependency on the old rule shape:

- `slug`
- `delayMinutes`
- `targetPlans`
- `triggerMessageId`
- `triggerSlug`

### 4. Replaced tests with Task 2-focused coverage

Reworked `trigger-service.test.ts` to cover:

- `AND` condition evaluation
- numeric and group conditions
- delay calculation for all supported units
- scheduling only when all conditions pass
- skipping on condition mismatch
- deduplication by rule/chat/event occurrence
- message snapshot creation with `triggerRuleId` / `triggerEventKey`
- pending scheduled trigger processing

## TDD evidence

Red:

- Replaced the legacy slug-based tests with Task 2 tests first.
- Initial focused run failed because `./trigger-condition` did not exist yet, which confirmed the new tests were exercising missing behavior rather than passing against the old implementation.

Green:

- Implemented the new types, helpers, and service refactor.
- Re-ran the focused test suite and it passed.

## Verification run

Executed:

`npm test -- src/features/triggers/trigger-service.test.ts`

Result:

- 1 test file passed
- 8 tests passed

## Adaptations from the brief

One small adaptation was needed for current code realities:

- I kept `export type TriggerMessageRecord = TriggerRuleRecord` inside `trigger-service.ts` as a temporary compatibility alias because other files outside Task 2 still import that exported type name. The runtime service contract itself was still moved to the new rule-based model.

## Concerns

The Task 2 files now use the new trigger-rule contract, but existing callers outside this task's allowed file scope still construct the service using the old dependency names and old `scheduleTrigger(...)` arguments. I did not update those files because the task explicitly limited scope to the four Task 2 files. As a result:

- the focused Task 2 tests pass
- repo-wide typecheck/build is likely still blocked until the integration task updates the runtime call sites to `findActiveRulesByEvent(...)`, `triggerRuleId/triggerEventKey`, and `TriggerUserState`

## Commit

Created after verification:

- `a9f7a81 feat: add trigger rule evaluation service`
