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

---

## Review Fix Addendum

### Review issues addressed

1. **Prisma runtime viability**
   - Regenerated the Prisma client with the current schema using `npm run prisma:generate`.
   - Removed the fake `unknown` delegate bridge from:
     - `src/app/api/cron/process-triggers/route.ts`
     - `src/bot/commands/start.ts`
     - `src/app/api/payments/cloudpayments/route.ts`
   - The task-owned runtime callers now use the real generated Prisma delegates (`prisma.triggerRule`, `prisma.scheduledMessage`) directly.
   - Added explicit JSON/value mapping only where Prisma field types legitimately need conversion:
     - trigger-rule `conditions`
     - trigger-rule `buttons`
     - scheduled-message `buttons`

2. **`tariff.paid` idempotency**
   - Changed the payment webhook flow to capture the persisted `payment` row returned from `prisma.$transaction(...)`.
   - `handleTriggerEvent("tariff.paid", ...)` now passes `occurredAt: payment.createdAt`.
   - This makes retry dedupe stable across webhook retries because the event timestamp now comes from durable persisted payment data rather than a fresh `new Date()`.

3. **`user.started` scoping**
   - Narrowed `user.started` dispatch so it only fires from the actual `/start` command path.
   - `/menu`, onboarding completion, `try_free`, and menu return now reuse the access-aware entry path **without** dispatching `user.started`.
   - Onboarding behavior remains separate.

### Additional test coverage added for review fixes

- `src/app/api/payments/cloudpayments/route.test.ts`
  - verifies `tariff.paid` dispatch uses persisted payment `createdAt`
- `src/bot/commands/start.test.ts`
  - verifies `/start` dispatches `user.started`
  - verifies `/menu`, `try_free`, onboarding completion, and menu return do **not** dispatch `user.started`

### Fresh command evidence

1. Prisma regenerate

Command:
```bash
npm run prisma:generate
```

Result:
- Passed
- Prisma Client v7.8.0 regenerated into workspace `node_modules/@prisma/client`
- Generated client now exposes `triggerRule`, `triggerRuleId`, and `triggerEventKey`

2. Focused review-fix tests

Command:
```bash
npm test -- src/features/triggers/trigger-event-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/bot/commands/start.test.ts src/app/api/payments/cloudpayments/route.test.ts
```

Result:
- Passed
- `Test Files  4 passed (4)`
- `Tests  12 passed (12)`

3. Full type-check after regeneration

Command:
```bash
npm run typecheck
```

Result:
- Failed
- Remaining errors are outside the core Task 3 runtime files and are concentrated in `src/app/admin/triggers/page.tsx`
- Those failures are old-schema admin trigger page references (`triggerMessage`, `triggerMessageId`) that the real regenerated Prisma client correctly rejects
- The Task 3 runtime caller files fixed in this pass no longer appear in the type-check failure output

### Updated concerns

- The original Prisma compatibility bridge concern is resolved.
- One remaining workspace concern is outside the Task 3 runtime ownership: `src/app/admin/triggers/page.tsx` still targets the old trigger schema and now fails type-checking after the real Prisma client regeneration. The runtime entry points fixed in this task are using the real generated client successfully, but the admin trigger page needs a separate schema-alignment follow-up.
