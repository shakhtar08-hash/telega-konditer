# RU/EU Migration Phase A Audit

> Phase A only. No production, infrastructure, database, or deployment changes were performed during this audit.

**Audit date:** 2026-07-16

**Scope:** Audit the current `pastry-ai` repository and the currently reachable live infrastructure against the migration brief for moving persistent production data to RU infrastructure, using EU only as Telegram/AI gateway plus reverse proxy/WireGuard edge.

## What Was Audited

- Local repository structure and runtime assumptions
- Live RU server state
- Live EU server state
- Environment variable contract
- Prisma/PostgreSQL integration
- Telegram webhook and cron delivery paths
- AI provider call paths
- File upload/storage behavior in repo
- Containerization and deployment artifacts present in repo
- Current production database shape through read-only app-container access

## Live Infrastructure Snapshot

### RU server: `159.194.206.106`

- Hostname: `vlvtmmkpld`
- OS: Ubuntu 24.04.4 LTS
- Kernel: Linux `6.8.0-134-generic`
- Public listening ports observed:
  - `22/tcp` only
- Docker service: inactive
- UFW: inactive
- Disk:
  - root filesystem about `80G`, roughly `4%` used
- Memory:
  - about `5.8 GiB` RAM
- Network:
  - public interface `eth0`
  - no Docker bridge, no WireGuard interface observed

Interpretation:

- RU appears to be a fresh host and is not yet serving application traffic.
- This is consistent with the brief's expectation that RU is new and empty.

### EU server: `194.113.209.251`

- Hostname: `lfqndwuoji`
- OS: Ubuntu 24.04.4 LTS
- Kernel: Linux `6.8.0-134-generic`
- Public listening ports observed:
  - `22/tcp`
  - `80/tcp`
  - `443/tcp`
  - `443/udp`
  - `8080/tcp`
  - `8000/tcp`
  - `6001/tcp`
  - `6002/tcp`
- Docker service: active
- UFW: inactive
- Docker containers observed:
  - `coolify`
  - `coolify-proxy`
  - `coolify-db`
  - `coolify-redis`
  - `coolify-realtime`
  - `coolify-sentinel`
  - one production app container for `pastry-ai`
- Docker volumes observed:
  - `coolify-db`
  - `coolify-redis`
- Disk:
  - root filesystem about `39G`, roughly `28%` used
- Memory:
  - about `3.8 GiB` RAM

Interpretation:

- EU is the current active production host and already runs Coolify plus the `pastry-ai` app.
- Firewall hardening from the brief is not yet in place on either host.

## Current State Map

### 1. Application runtime

- The app is a Next.js App Router application with server routes, Telegram bot logic, Prisma, and AI integrations in one codebase.
- The repository currently ships a single multi-stage Docker image and starts one application container on port `3000`.
- There is no repo-managed `docker-compose.yml` or other checked-in multi-service deployment manifest for RU/EU split deployment.
- Live EU inspection confirms the current production app is a single Coolify-managed application container behind the Coolify proxy.
- Live EU inspection also confirms the app container has no mounted volumes.

Evidence:

- [README.md](/C:/Users/Roof/Documents/Телега/pastry-ai/README.md:1)
- [Dockerfile](/C:/Users/Roof/Documents/Телега/pastry-ai/Dockerfile:1)

### 2. Database and ORM

- Prisma is configured for PostgreSQL.
- Runtime Prisma uses `DATABASE_URL` through `PrismaPg`.
- Migration/config tooling prefers `DIRECT_URL`, then falls back to `DATABASE_URL`.
- The schema contains core user and operational data in the same database:
  - `User`
  - `Conversation`
  - `Message`
  - `Payment`
  - `UserTariff`
  - `TelegramSession`
  - `ApiSecret`
  - `ScheduledMessage`
  - trigger-related records
- Live EU inspection confirms the running production container is configured against Supabase-hosted PostgreSQL, using both pooled and direct PostgreSQL URLs.
- A read-only query through the live app container confirmed:
  - current database name is `postgres`
  - backend version is PostgreSQL `17.6`
  - enabled extensions include `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, and `uuid-ossp`
- The live database still contains Supabase-managed schemas:
  - `auth`
  - `storage`
  - `realtime`
- Public application tables are present in `public`, matching the repo schema.

Evidence:

- [prisma/schema.prisma](/C:/Users/Roof/Documents/Телега/pastry-ai/prisma/schema.prisma:5)
- [src/db/prisma.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/db/prisma.ts:1)
- [prisma.config.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/prisma.config.ts:1)

### 3. Supabase coupling

- The codebase matches the brief's claim that Supabase is primarily used as managed Postgres.
- However, runtime configuration is still explicitly coupled to Supabase:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `loadEnv()` currently treats all three as required for app startup.
- Supabase helper clients still exist for server, browser, and admin use.
- Admin settings still present Supabase values as first-class runtime settings.
- Local grep found no active usage of those helper clients outside the helper modules themselves, tests, and admin settings references. That suggests the helpers may now be dead or near-dead code, but this must be confirmed before removal.
- Live production container inspection confirms that Supabase URL and both Supabase keys are currently injected into the running app environment.

Evidence:

- [src/lib/env.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/lib/env.ts:3)
- [src/lib/supabase/server.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/lib/supabase/server.ts:1)
- [src/lib/supabase/browser.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/lib/supabase/browser.ts:1)
- [src/lib/supabase/admin.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/lib/supabase/admin.ts:1)
- [src/app/admin/settings/page.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/settings/page.tsx:22)
- [.env.example](/C:/Users/Roof/Documents/Телега/pastry-ai/.env.example:1)

### 4. Telegram ingress path

- Telegram webhook traffic currently lands directly in the main application route `/api/telegram/webhook`.
- The route validates Telegram's secret header in-process.
- The route reads the raw request body directly with `request.text()` and parses JSON locally.
- Duplicate prevention is stored in the primary database via `TelegramSession`.
- The main bot processing happens in the same application process via `after(...)`.
- There is no separate internal endpoint such as `/internal/telegram` in the current repo.
- There is no gateway-specific code path for forwarding Telegram traffic from EU to RU.
- Live EU deployment labels confirm the application is currently served directly over a Coolify-managed public HTTPS hostname and routes to app port `3000`.

Evidence:

- [src/app/api/telegram/webhook/route.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/telegram/webhook/route.ts:72)

### 5. AI egress path

- AI calls are currently performed directly from the main application runtime.
- The current provider layer calls OpenAI, OpenRouter, and KIE from app code.
- No gateway abstraction matching the brief's `AI Gateway` exists in the repo today.
- No `sanitizeAIRequest()` or equivalent payload-minimization boundary was found during the Phase A repo audit.

Evidence:

- [src/ai/provider/openai-provider.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/ai/provider/openai-provider.ts:1)
- [src/ai/provider/kie-provider.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/ai/provider/kie-provider.ts:1)

### 6. Scheduled jobs and outbound Telegram sends

- Scheduled trigger delivery is currently performed by the main application via `/api/cron/process-triggers`.
- The cron route authenticates with `CRON_SECRET` and sends Telegram messages directly using `grammy` Bot API.
- Scheduled payload snapshots are stored in the main database, including message text, image URL, button payload, and send timing.
- Failed trigger sends are currently logged with `chatId`.

Evidence:

- [src/app/api/cron/process-triggers/route.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/cron/process-triggers/route.ts:1)
- [src/features/triggers/trigger-service.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/features/triggers/trigger-service.ts:7)

### 7. Logging and sensitive data exposure

- The webhook route does not log raw Telegram request bodies, which is good.
- The webhook route does read the full raw body in-process before parsing.
- Trigger send failures log `chatId`, which is personal data and conflicts with the target EU logging restrictions if this path remains on EU.
- Other routes and handlers use `console.error(...)` widely; a full runtime logging audit on deployed environments is still required because the repo alone does not reveal Docker, reverse proxy, platform, or aggregation logging behavior.

Evidence:

- [src/app/api/telegram/webhook/route.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/telegram/webhook/route.ts:79)
- [src/app/api/telegram/webhook/route.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/telegram/webhook/route.ts:258)
- [src/features/triggers/trigger-service.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/features/triggers/trigger-service.ts:106)

### 8. File storage

- The repository stores admin-uploaded images under `public/uploads/admin`.
- Trigger-related UI and tests refer to `/uploads/admin/triggers/...`.
- The Docker image copies the `public` directory into the container image.
- No persistent volume mapping is defined in the repo today.
- This means persistent uploads are not yet expressed as durable RU-hosted storage in repo-managed deployment artifacts.
- Live EU container inspection confirms the current production application container has no mounts, so app-level filesystem persistence is not explicitly provisioned for the running container.

Evidence:

- [Dockerfile](/C:/Users/Roof/Documents/Телега/pastry-ai/Dockerfile:29)
- [src/app/admin/triggers/trigger-form.tsx](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/trigger-form.tsx:759)
- [src/app/admin/_lib/save-admin-image.test.ts](/C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/_lib/save-admin-image.test.ts:13)

### 9. Redis / queue / gateway / WireGuard

- No checked-in Redis setup or Redis client usage was confirmed in the repo audit.
- No WireGuard configuration was found in the repo.
- No EU Telegram gateway service was found in the repo.
- No EU AI gateway service was found in the repo.
- Live EU host does run Coolify's own Redis, but no repo evidence shows application-level Redis usage.
- Live RU host has no active Docker services and no WireGuard interface configured yet.

## Confirmed Gaps vs Migration Brief

### Repo-confirmed mismatches

1. The application is not yet split into RU app/data plane and EU edge/gateway plane.
2. Telegram webhook traffic currently terminates inside the main application instead of an EU gateway forwarding to RU over WireGuard.
3. AI traffic currently leaves directly from the main application instead of going through a dedicated EU AI gateway.
4. Supabase remains part of required runtime configuration even though the app appears to use it mainly as Postgres.
5. Supabase helper clients and admin settings wiring still exist and need review/removal after safe migration.
6. There is no checked-in RU/EU deployment topology, no Compose stack, and no gateway manifests.
7. Admin uploads are still modeled as filesystem assets under `public`, not as explicit RU persistent storage.
8. Sensitive logging hardening is incomplete for the target architecture because `chatId` is logged on trigger delivery failures.
9. There is no evidence yet of backup automation, restore verification, or WireGuard being configured on the live servers.
10. UFW is inactive on both RU and EU, so the target firewall posture is not yet implemented.
11. The live production app still receives Supabase credentials and talks directly to Supabase-hosted PostgreSQL from EU.
12. The live production app container has no mounted persistent storage for application files.

### Items blocked on infrastructure access

These cannot be confirmed from the repo alone:

- What currently runs on the EU server
- Exact environment variables configured in production
- Existing Coolify logs and whether they contain sensitive payloads
- Exact per-table row counts for migration verification
- Database size, index size, and dump/restore timing
- Whether any off-repo cron jobs, Docker labels, sidecars, or reverse proxies exist
- Whether DNS outside the current Coolify-generated hostname is already in use

### Phase A items now confirmed live

- EU currently runs Coolify and the active production `pastry-ai` application.
- RU is not yet hosting the application.
- Production DB access is currently through Supabase PostgreSQL.
- Supabase platform schemas still exist in the production database.
- The running app container has no mounts.
- UFW is inactive on both hosts.

## Required Accesses and Secrets for Phase B Onward

The next phase is blocked until the following are available through a secure channel:

1. Supabase / current production database access policy confirmation
   - current production `DATABASE_URL`
   - current production `DIRECT_URL` if separate
   - confirmation whether any Supabase extensions are enabled
   - permission to run expanded read-only inspection queries

2. Coolify access on EU
   - UI access or server-level Docker access
   - permission to inspect logs, deployment history, domains, and env configuration in a safer UI context

3. DNS / domain inventory
   - current public domains/subdomains
   - which hostname is bound to Telegram webhook
   - certificate management ownership

4. Secret inventory ownership
   - who will provide new RU database credentials
   - who will generate WireGuard keys
   - who owns rotation of Telegram, DB, and SSH credentials after cutover

## Recommended Execution Plan

### Phase A

- Complete repo audit
- Inspect current EU deployment and Supabase in read-only mode
- Document exact before-state
- Stop for approval

### Phase B

- Prepare RU host hardening
- Create non-root admin user and SSH key-based access
- Install PostgreSQL 17
- Install backup tooling
- Prepare persistent storage layout for uploads and app data
- Prepare WireGuard on RU
- Do not cut over production

### Phase C

- Prepare staging-grade migration path from Supabase
- Run first logical dump from Supabase
- Restore into RU staging database
- Verify schema, row counts, indexes, enums, and Prisma compatibility
- Confirm app can boot against restored staging data

### Phase D

- Remove mandatory Supabase runtime coupling from app config
- Introduce RU-targeted database/runtime config
- Add AI payload sanitization boundary before external model calls
- Prepare gateway-friendly internal endpoints
- Add deployment artifacts for RU app and data services
- Run tests, build, and staging deployment validation

### Phase E

- Deploy EU Telegram gateway
- Deploy EU AI gateway
- Restrict EU persistence and logging
- Connect EU to RU via WireGuard
- Validate internal auth and healthchecks

### Phase F

- Freeze a cutover window
- Take fresh production backup/dump
- Restore latest state to RU production
- Switch app runtime to RU database and RU app
- Repoint Telegram webhook to EU gateway
- Repoint AI traffic through EU gateway
- Smoke test end-to-end flows

### Phase G

- Observe for 72 hours
- Keep Supabase online for rollback only
- Rotate exposed/legacy secrets
- Remove obsolete Supabase runtime dependencies after stability confirmation

## Rollback Plan

### Pre-cutover rollback

- No rollback needed for audit/preparation phases beyond deleting unused staging resources.

### Cutover rollback

If production cutover fails:

1. Stop new traffic from using the RU target.
2. Repoint Telegram webhook back to the last known-good production endpoint.
3. Restore app runtime environment to the pre-cutover database and routing configuration.
4. Keep RU data snapshot for forensic comparison.
5. Do not delete RU staging/production restore data until discrepancy analysis is complete.
6. Keep Supabase as the system of record until stability is re-established.

### Data rollback rule

- Never perform destructive changes to Supabase during the initial migration window.
- Always take a fresh logical dump immediately before production cutover.
- Record row counts per critical table before and after restore.

## Main Risks

1. Hidden production dependencies on Supabase outside the audited repo surface.
2. Production Coolify contains deployment details not represented in git; some were confirmed live, but logs and history still need inspection.
3. Telegram webhook cutover can duplicate or drop updates if gateway forwarding and idempotency are not tested carefully.
4. AI prompt/response privacy requirements are currently enforced only informally; gateway and logging changes must make them architectural.
5. Upload persistence is currently weakly defined; moving to RU without a durable storage plan risks broken admin assets.
6. Logging on EU may still leak personal data through platform logs even if app code looks clean.
7. Secret rotation is mandatory because server credentials were disclosed in chat context and the current production container also holds live application secrets in plain environment variables.

## Immediate Recommendations Before Phase B

1. Inspect live Coolify application logs and deployment history in read-only mode before changing any code.
2. Confirm whether RU should run plain Docker Compose or an additional orchestrator.
3. Decide where RU backups will be stored inside RF.
4. Approve a strict secret-rotation checklist for:
   - SSH/root credentials
   - database credentials
   - Telegram secrets
   - internal gateway secrets
   - WireGuard keys if regenerated

## Phase A Exit Criteria

Phase A can be considered complete after:

- repo audit is documented
- live EU deployment is inspected read-only
- live Supabase usage is inspected read-only
- current-state map and deltas are confirmed
- execution plan and rollback plan are approved

At the moment, the repo audit and initial live server/database audit are complete. Remaining optional Phase A depth items are Coolify log/history inspection and broader row-count verification before Phase B.
