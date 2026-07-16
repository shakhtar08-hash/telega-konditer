# Task 4 Report: Admin Runtime View And RU Deployment Artifacts

## Status

Implemented the requested Task 4 scope in the assigned files only:

- Updated the admin settings runtime view to reflect the RU/EU transition architecture keys.
- Added a focused regression test for the runtime key list.
- Added a minimal checked-in RU deployment path under `deploy/ru`.

No AI provider files, webhook routes, or env schema files were changed.

## Scope Executed

### Updated runtime rows

File: `src/app/admin/settings/page.tsx`

Replaced the old Supabase-focused runtime rows with the Phase D transition list from the brief:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`
- `INTERNAL_API_BASE_URL`
- `INTERNAL_API_SHARED_SECRET`
- `INTERNAL_TELEGRAM_INGRESS_URL`
- `INTERNAL_AI_GATEWAY_URL`
- `APP_REGION`
- `APP_ROLE`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Removed the Supabase runtime rows from the admin runtime table:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Added test-first coverage

File: `src/app/admin/settings/page.test.tsx`

Added a targeted Vitest test that:

- renders the page with mocked Prisma access
- asserts `dynamic === "force-dynamic"`
- asserts the rendered output contains `INTERNAL_API_BASE_URL`
- asserts the rendered output contains `INTERNAL_AI_GATEWAY_URL`
- asserts the rendered output does not contain `SUPABASE_SERVICE_ROLE_KEY`

### Added RU deployment artifacts

Files:

- `deploy/ru/docker-compose.yml`
- `deploy/ru/.env.example`
- `deploy/ru/README.md`

Added a minimal RU deployment path that:

- builds from the repository root Dockerfile
- loads runtime values from `deploy/ru/.env`
- exposes port `3000`
- persists uploads to `/srv/pastry-ai/uploads`
- persists logs to `/srv/pastry-ai/logs`

The env example is intentionally minimal and includes the transition runtime variables needed for this phase, with `APP_REGION=ru` and `APP_ROLE=app`.

The README documents:

- what the RU deployment directory is for
- how to create `deploy/ru/.env`
- how to start the RU deployment
- that internal URLs may still point back to the same app during Phase D because this is not a cutover

## TDD Record

### Red

Created `src/app/admin/settings/page.test.tsx` before changing production code.

Command run:

```bash
npm test -- src/app/admin/settings/page.test.tsx
```

Observed result:

- test failed as expected
- failure reason: rendered page did not contain `INTERNAL_API_BASE_URL`
- failure output also showed `SUPABASE_SERVICE_ROLE_KEY` was still present in the runtime table

### Green

Updated `src/app/admin/settings/page.tsx` and added the RU deployment files.

Re-ran:

```bash
npm test -- src/app/admin/settings/page.test.tsx
```

Observed result:

- 1 test file passed
- 1 test passed
- exit code `0`

## Verification

### Verified successfully

Command:

```bash
npm test -- src/app/admin/settings/page.test.tsx
```

Result:

- PASS
- `1` file passed
- `1` test passed

### Verification blocked by local environment

Requested command from brief:

```bash
docker compose -f deploy/ru/docker-compose.yml config
```

Observed result:

- could not execute because `docker` is not installed in this environment
- PowerShell error: `The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.`

Because of that, I could not provide the requested normalized compose output in this session.

## Files Changed

- `src/app/admin/settings/page.tsx`
- `src/app/admin/settings/page.test.tsx`
- `deploy/ru/docker-compose.yml`
- `deploy/ru/.env.example`
- `deploy/ru/README.md`

## Commit

Created one scoped commit for this task after the targeted test passed.

Commit message:

```text
chore: add ru deployment artifacts
```

## Concerns

- Docker Compose validation from the brief remains unverified here because the local machine does not have Docker installed.
- The checked-in RU deployment path expects a real `deploy/ru/.env` file to be created from `.env.example` before startup.
