# Task 1 Report: Runtime Config And Internal Auth

Date: 2026-07-16
Worktree: `C:\Users\Roof\Documents\Телега\pastry-ai`

## Scope

Implemented the Task 1 slice only:

- Modified `src/lib/env.ts`
- Modified `src/lib/env.test.ts`
- Created `src/lib/internal-service-auth.ts`
- Created `src/lib/internal-service-auth.test.ts`

No AI transport, Telegram internal route, admin settings, or deploy artifacts were changed.

## TDD Record

### RED

Added failing tests first for:

- transition config loading without any `SUPABASE_*` variables
- parsing the optional internal routing/runtime variables
- validating a request carrying the internal shared secret header

Focused command run exactly as required:

```bash
npm test -- src/lib/env.test.ts src/lib/internal-service-auth.test.ts
```

Result:

- Exit code: `1`
- `src/lib/internal-service-auth.test.ts` failed because `./internal-service-auth` did not exist yet
- `src/lib/env.test.ts` transition tests failed because `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` were still required

Observed failure evidence:

```text
Error: Cannot find module './internal-service-auth'
Error: Invalid environment: ... SUPABASE_URL ... SUPABASE_ANON_KEY ... SUPABASE_SERVICE_ROLE_KEY ...
```

### GREEN

Implemented the minimum production changes to satisfy the brief:

- made `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` optional in `src/lib/env.ts`
- added optional runtime config fields:
  - `INTERNAL_API_BASE_URL`
  - `INTERNAL_API_SHARED_SECRET`
  - `INTERNAL_TELEGRAM_INGRESS_URL`
  - `INTERNAL_AI_GATEWAY_URL`
  - `APP_REGION` as `"eu" | "ru"`
  - `APP_ROLE` as `"ingress" | "app" | "cron"`
- added `src/lib/internal-service-auth.ts` exporting:
  - `INTERNAL_AUTH_HEADER = "x-internal-shared-secret"`
  - `isValidInternalServiceRequest(request, expectedSecret)`

Re-ran the same focused command:

```bash
npm test -- src/lib/env.test.ts src/lib/internal-service-auth.test.ts
```

Result:

- Exit code: `0`
- `2` test files passed
- `5` tests passed

Observed pass evidence:

```text
Test Files  2 passed (2)
Tests  5 passed (5)
```

## Notes

- Existing env fields outside this task were preserved.
- The internal auth helper is intentionally minimal and matches the brief exactly by comparing the expected shared secret to the request header value.

## Commit

Created commit:

- `refactor: add transition runtime config`

## Review Fixes - 2026-07-16

Reviewer findings addressed within the same owned scope:

- `src/lib/env.ts`
- `src/lib/env.test.ts`
- `src/lib/internal-service-auth.ts`
- `src/lib/internal-service-auth.test.ts`

### Root Cause

The first Task 1 implementation made the three `SUPABASE_*` variables independently optional in the exported env type. That created two problems:

- partial Supabase configuration was accepted at runtime
- existing direct Supabase consumers calling `loadEnv()` received `string | undefined` at compile time

### Fix

Updated `loadEnv` so the contract is split cleanly:

- `loadEnv(source)` supports transition parsing where the entire Supabase triple may be absent
- partial Supabase triples are rejected during validation
- `loadEnv()` preserves the legacy fully-configured Supabase contract for existing direct consumers

Also expanded auth coverage with negative-path tests for:

- wrong internal shared secret
- missing internal auth header

Added invalid-config coverage for:

- partial Supabase configuration
- invalid `APP_REGION`

### RED Evidence For Review Fix

Command:

```bash
npm test -- src/lib/env.test.ts src/lib/internal-service-auth.test.ts
```

Result:

- Exit code: `1`
- `src/lib/env.test.ts` failed on the new partial-Supabase regression test

Observed failure excerpt:

```text
FAIL  src/lib/env.test.ts > loadEnv transition config > rejects partially configured Supabase settings
AssertionError: expected [Function] to throw an error
```

### GREEN Evidence For Review Fix

Command:

```bash
npm test -- src/lib/env.test.ts src/lib/internal-service-auth.test.ts
```

Result:

- Exit code: `0`
- `2` test files passed
- `9` tests passed

Observed output:

```text
Test Files  2 passed (2)
Tests  9 passed (9)
```

### Typecheck Evidence

Command:

```bash
npm run typecheck
```

Result:

- Exit code: `0`

Observed output:

```text
> pastry-ai@0.1.0 typecheck
> tsc --noEmit
```
