# Task 3 Report: Internal Telegram Contract And Public Route Stability

## Status

Completed on July 16, 2026.

## Scope handled

- Added `src/app/api/internal/telegram/route.ts`
- Added `src/app/api/internal/telegram/route.test.ts`
- Updated `src/app/api/telegram/webhook/route.test.ts`
- Left `src/app/api/telegram/webhook/route.ts` behavior unchanged

## What changed

### Internal ingress route

Implemented a new `POST` handler at `/api/internal/telegram` that:

- loads environment values with `loadEnv()`
- reuses `isValidInternalServiceRequest()` from `src/lib/internal-service-auth.ts`
- rejects requests with `401 Unauthorized` when `INTERNAL_API_SHARED_SECRET` is missing or the request secret is invalid
- forwards authorized payloads into the existing public Telegram webhook handler
- injects `x-telegram-bot-api-secret-token` with `TELEGRAM_WEBHOOK_SECRET`
- preserves the JSON request body for the forwarded call

This keeps the internal forwarding contract future-ready while reusing the current public webhook logic instead of duplicating it.

### Public route stability coverage

Added a regression test proving the public `/api/telegram/webhook` route still rejects requests that do not present the Telegram webhook secret. This protects the existing direct integration behavior during the new internal-route introduction.

## TDD flow followed

1. Wrote the new internal route tests first.
2. Added the public-route stability regression test before implementation changes.
3. Ran the focused tests and confirmed failure because `src/app/api/internal/telegram/route.ts` did not exist yet.
4. Implemented the minimal internal forwarding route.
5. Re-ran the same focused tests and confirmed they passed.

## Verification

Command run:

```bash
npm test -- src/app/api/internal/telegram/route.test.ts src/app/api/telegram/webhook/route.test.ts
```

Observed result:

- 2 test files passed
- 10 tests passed
- exit code 0

## Commit

Created commit:

```text
feat: add internal telegram ingress route
```

## Constraints respected

- Reused the existing internal auth helper from `src/lib/internal-service-auth.ts`
- Preserved direct integrations and public webhook behavior
- Did not move or cut over the live webhook
- Did not touch admin settings, AI provider files, deploy artifacts, or env schema files
- Avoided reverting unrelated in-progress work in the repository

## Concerns

No functional concerns from this slice. The internal route forwards using the existing webhook handler, so any future contract expansion should continue to be added around that shared path unless the public and internal flows intentionally diverge later.
