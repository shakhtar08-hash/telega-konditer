# Task 3 Report: Add event state loading and backend trigger entry points

## Status

DONE_WITH_CONCERNS

## What changed

- Added `src/features/triggers/trigger-user-state.ts` with `loadTriggerUserState(userId)` and a small dependency-injected factory for testability.
- Added `src/features/triggers/trigger-event-service.ts` with `createTriggerEventService(...)` and `handleTriggerEvent(eventKey, payload)`.
- Updated `src/bot/commands/start.ts` to dispatch `user.started` through the event service instead of calling the old slug-based trigger scheduling path.
- Updated `src/app/api/payments/cloudpayments/route.ts` to dispatch `tariff.paid` through the event service after successful payment persistence.
- Updated `src/app/api/cron/process-triggers/route.ts` to use the current trigger-rule contract:
  - `findActiveRulesByEvent`
  - `triggerRuleId`
  - `triggerEventKey`
  - dedupe lookup including `triggeredAt`
- Added focused tests:
  - `src/features/triggers/trigger-event-service.test.ts`
  - `src/app/api/cron/process-triggers/route.test.ts`
- Updated `src/bot/commands/start.test.ts` so the existing runtime caller coverage follows the new event entry point.

## Behavior delivered

- Runtime callers now load `TriggerUserState` before scheduling trigger rules.
- `/start` uses `user.started`.
- successful CloudPayments webhook handling uses `tariff.paid`.
- the cron processor now points at the new trigger-rule / scheduled-message shape instead of the legacy slug-based contract.

## Small adaptations from the brief

### 1. Generation count source

The brief’s prose mentioned Prisma repositories including `TokenUsage`, but the sample loader used `generatedRecipeContext.count(...)`, and the current app already has that model in active use for generated recipe history. I kept the sample behavior goal and loaded `generationCount` from `generatedRecipeContext`.

### 2. Prisma client compatibility bridge

The schema and task context are already on `TriggerRule`, `ScheduledMessage.triggerRuleId`, and `ScheduledMessage.triggerEventKey`, but the generated Prisma client available in this workspace still types the older `triggerMessageId` / `triggerSlug` shape. To avoid touching unrelated generated files in this task, I added narrow `unknown`-to-runtime-model bridges inside the owned runtime callers so the new integration compiles and runs against the intended schema contract.

## Verification

- `npm run typecheck` ✅
- `npm test -- src/features/triggers/trigger-event-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/bot/commands/start.test.ts` ✅

## Concerns

- The Prisma type bridge is intentionally narrow and local, but it should be removed once the Prisma client is regenerated against the current schema so the code can return to fully inferred model access.
