# RU/EU Migration Phase F Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a controlled production cutover from the current EU-hosted path to the RU application/runtime while preserving rollback readiness for 72 hours.

**Architecture:** The cutover stays operationally reversible. Telegram switches first to the EU gateway public ingress, then AI routing switches to the gateway path after Telegram smoke tests pass. Supabase and the old EU production application remain intact for rollback during the entire observation window.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Docker Compose, Telegram Bot API, OpenAI/KIE gateway flow, WireGuard, PostgreSQL, Coolify-managed EU production app, RU Docker deployment.

## Global Constraints

- No destructive shutdown of Supabase during this phase.
- No deletion of the current EU production application during this phase.
- No long-term cleanup of legacy configuration during this phase.
- The observation window after cutover is 72 hours.
- Telegram must switch before AI inside the same controlled cutover window.
- Every public switch action must have a matching rollback action prepared first.

---

## File Structure

- Create: `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-report.md` - execution log for live cutover evidence, timestamps, commands used, outcomes, and rollback notes.
- Reference: `docs/superpowers/specs/2026-07-16-ru-eu-migration-phase-f-cutover-design.md` - approved cutover design and constraints.
- Reference: `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-e-report.md` - live parallel gateway state already verified in Phase E.
- Modify live file on RU: `/srv/pastry-ai/app/pastry-ai/deploy/ru/.env` - final production runtime settings for RU app path.
- Modify live file on EU: `/root/pastry-ai-eu-gateway/git-repo/pastry-ai/deploy/eu-gateway/.env` - final production gateway runtime settings and public gateway path assumptions.
- Reference live EU container: `y14ls51y1broihq0sxih7nbf-214210046769` - last known-good old production app path.
- Reference live EU gateway container: `pastry-ai-eu-gateway-pastry-ai-eu-gateway-1`.
- Reference live RU container: `ru-pastry-ai-1`.

### Task 1: Preflight Freeze And Evidence Capture

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-16-ru-eu-migration-phase-f-report.md`

**Interfaces:**
- Consumes: current live server access, Telegram bot token from live env, existing Phase E deployment paths
- Produces: a timestamped preflight evidence block and go/no-go decision recorded in the Phase F report

- [ ] **Step 1: Write the report skeleton before live actions**

```markdown
# RU/EU Migration Phase F Report

Date: 2026-07-16
Status: Draft

## Cutover Window
## Preflight Evidence
## Backup And Snapshot Evidence
## Telegram Switch
## Telegram Smoke Tests
## AI Switch
## AI Smoke Tests
## Rollback Readiness
## Observation Window Start
## Final Assessment
```

- [ ] **Step 2: Run the preflight health checks and current-state capture**

Run on RU:

```bash
curl -sS -D - http://127.0.0.1:3000/api/health/gateway
docker ps --format '{{.Names}} {{.Status}}'
```

Run on EU:

```bash
curl -sS -D - http://127.0.0.1:3001/api/health/gateway
docker ps --format '{{.Names}} {{.Status}}'
```

Run on EU to capture current Telegram webhook state:

```bash
TOKEN="$(docker exec y14ls51y1broihq0sxih7nbf-214210046769 printenv TELEGRAM_BOT_TOKEN)"
curl -sS "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"
```

Expected:
- RU healthcheck returns `200`
- EU gateway healthcheck returns `200`
- old EU production app container is still running
- current Telegram webhook info is captured in the report

- [ ] **Step 3: Verify public EU gateway ingress is production-ready before any switch**

Run on EU:

```bash
docker inspect pastry-ai-eu-gateway-pastry-ai-eu-gateway-1 --format '{{json .NetworkSettings.Ports}}'
ss -tulpn | grep ':443'
```

Then verify the chosen public HTTPS gateway URL manually from outside the container host:

```bash
curl -sS -D - "https://<public-gateway-host>/api/health/gateway"
```

Expected:
- a stable public HTTPS gateway URL exists
- `/api/health/gateway` is reachable through that public URL
- if this check fails, cutover is `NO-GO`

- [ ] **Step 4: Record the go/no-go decision in the report**

Record one of:

```markdown
Go/No-Go: GO
Reason: all preflight gates are green
```

or

```markdown
Go/No-Go: NO-GO
Reason: <exact failing gate>
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-report.md
git commit -m "docs: add phase f cutover report skeleton"
```

### Task 2: Fresh Backup And RU Snapshot Verification

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-16-ru-eu-migration-phase-f-report.md`

**Interfaces:**
- Consumes: current production database credentials from live environment, RU database access, row-count query set
- Produces: a final rollback snapshot reference, RU restore verification evidence, and table-count parity notes

- [ ] **Step 1: Capture the current production database URLs from the old EU production container**

Run on EU:

```bash
docker exec y14ls51y1broihq0sxih7nbf-214210046769 printenv DATABASE_URL
docker exec y14ls51y1broihq0sxih7nbf-214210046769 printenv DIRECT_URL
```

Expected:
- both production connection strings are available for backup and inspection commands

- [ ] **Step 2: Take a fresh logical dump immediately before cutover**

Run from a secure operator shell with direct production DB access:

```bash
pg_dump --format=custom --no-owner --no-privileges --dbname "$DIRECT_URL" --file "/secure-backup-location/pastry-ai-pre-cutover-2026-07-16.dump"
```

Expected:
- dump file is created successfully
- file path is written into the Phase F report

- [ ] **Step 3: Capture row counts for critical public tables**

Run:

```sql
select 'User' as table_name, count(*) from "User"
union all
select 'Conversation', count(*) from "Conversation"
union all
select 'Message', count(*) from "Message"
union all
select 'Payment', count(*) from "Payment"
union all
select 'UserTariff', count(*) from "UserTariff"
union all
select 'TelegramSession', count(*) from "TelegramSession"
union all
select 'ApiSecret', count(*) from "ApiSecret"
union all
select 'ScheduledMessage', count(*) from "ScheduledMessage";
```

Expected:
- counts are saved into the report as pre-cutover evidence

- [ ] **Step 4: Verify RU target state matches the intended cutover snapshot**

Run on RU:

```bash
psql "$DATABASE_URL" -c 'select version();'
psql "$DATABASE_URL" -c 'select count(*) from "User";'
psql "$DATABASE_URL" -c 'select count(*) from "Conversation";'
psql "$DATABASE_URL" -c 'select count(*) from "Message";'
```

Expected:
- RU database is reachable
- sample counts are consistent with the fresh snapshot or any documented final restore step
- if parity is not acceptable, cutover is `NO-GO`

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-report.md
git commit -m "docs: capture phase f backup and snapshot evidence"
```

### Task 3: Telegram Cutover And Smoke Tests

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-16-ru-eu-migration-phase-f-report.md`
- Modify live file on EU if needed: `/root/pastry-ai-eu-gateway/git-repo/pastry-ai/deploy/eu-gateway/.env`

**Interfaces:**
- Consumes: public HTTPS gateway URL, Telegram bot token, existing internal shared secret, RU internal Telegram route
- Produces: Telegram webhook moved to the EU gateway path plus first post-switch smoke-test evidence

- [ ] **Step 1: Verify the EU gateway public target one last time**

Run:

```bash
curl -sS -D - "https://<public-gateway-host>/api/health/gateway"
```

Expected:
- `200 OK`
- use the exact same public gateway host that will receive Telegram traffic

- [ ] **Step 2: Set the Telegram webhook to the EU gateway public path**

Run:

```bash
TOKEN="$(docker exec y14ls51y1broihq0sxih7nbf-214210046769 printenv TELEGRAM_BOT_TOKEN)"
SECRET="$(docker exec y14ls51y1broihq0sxih7nbf-214210046769 printenv TELEGRAM_WEBHOOK_SECRET)"
curl -sS -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -d "url=https://<public-gateway-host>/api/telegram/webhook" \
  -d "secret_token=${SECRET}" \
  -d "drop_pending_updates=false"
```

Expected:
- Telegram API returns `"ok":true`

- [ ] **Step 3: Confirm webhook registration**

Run:

```bash
curl -sS "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"
```

Expected:
- webhook URL now points to the EU gateway public path
- `last_error_message` is empty or absent

- [ ] **Step 4: Run Telegram smoke tests**

Run on EU and RU:

```bash
docker logs --tail 100 pastry-ai-eu-gateway-pastry-ai-eu-gateway-1
docker logs --tail 100 ru-pastry-ai-1
```

Then trigger one controlled Telegram test update through the real bot and verify:

```text
- the bot responds correctly
- no unauthorized internal forwarding errors appear
- no duplicate update loop appears
```

Expected:
- controlled Telegram test message is handled successfully end-to-end

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-report.md
git commit -m "docs: record phase f telegram cutover"
```

### Task 4: AI Routing Switch And Smoke Tests

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-16-ru-eu-migration-phase-f-report.md`
- Modify live file on RU: `/srv/pastry-ai/app/pastry-ai/deploy/ru/.env`

**Interfaces:**
- Consumes: RU app env, EU internal AI gateway URL, internal shared secret
- Produces: production AI requests routed through the EU gateway path with post-switch evidence

- [ ] **Step 1: Verify RU runtime env points AI traffic at the EU gateway path**

Expected setting in RU env:

```dotenv
INTERNAL_AI_GATEWAY_URL=http://10.10.0.2:3001/api/internal/ai
INTERNAL_API_SHARED_SECRET=<existing-shared-secret>
APP_REGION=ru
APP_ROLE=app
```

If changes are needed, apply them and restart RU app:

```bash
cd /srv/pastry-ai/app/pastry-ai/deploy/ru
docker compose up -d
```

Expected:
- RU app stays healthy after env confirmation or restart

- [ ] **Step 2: Run the AI gateway health and probe checks**

Run on EU:

```bash
curl -sS -D - http://127.0.0.1:3001/api/health/gateway
```

Run an authenticated AI probe:

```bash
curl -sS -o /tmp/phase-f-ai-probe.json -w '%{http_code}' \
  -X POST http://127.0.0.1:3001/api/internal/ai \
  -H 'content-type: application/json' \
  -H "x-internal-shared-secret: ${INTERNAL_API_SHARED_SECRET}" \
  --data '{"model":"gpt-image-1","provider":"openai","prompt":"phase-f-ai-probe-20260716"}'
```

Expected:
- the response is either a valid success payload or the known sanitized error payload
- prompt text does not appear in intended gateway logs

- [ ] **Step 3: Run application-level smoke tests after AI switch**

Run:

```bash
curl -sS -D - http://127.0.0.1:3000/api/health/gateway
docker logs --tail 100 ru-pastry-ai-1
docker logs --tail 100 pastry-ai-eu-gateway-pastry-ai-eu-gateway-1
```

Then verify one controlled production-like AI flow through the app UI or bot path.

Expected:
- RU app remains healthy
- EU gateway remains healthy
- no prompt leakage appears in the intended EU gateway logs

- [ ] **Step 4: Record rollback readiness after the AI switch**

Record in the report:

```markdown
Rollback readiness confirmed:
- old EU production app still running
- Supabase untouched
- previous webhook target recorded
- pre-cutover dump preserved
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-report.md
git commit -m "docs: record phase f ai cutover"
```

### Task 5: Observation Window Start And Rollback Package

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-16-ru-eu-migration-phase-f-report.md`

**Interfaces:**
- Consumes: successful Telegram and AI smoke tests, previous production webhook info, backup path, live container state
- Produces: official start of the 72-hour observation window and a ready-to-run rollback checklist

- [ ] **Step 1: Capture the starting state for the 72-hour window**

Run:

```bash
date -u
docker ps --format '{{.Names}} {{.Status}}'
```

Expected:
- report includes exact UTC observation-window start time
- all critical old and new containers are accounted for

- [ ] **Step 2: Write the rollback commands into the report**

Record concrete rollback actions:

```text
1. Use Telegram Bot API setWebhook to restore the previous public URL.
2. Restore RU and/or EU runtime env to the pre-cutover values if route overrides were changed.
3. Route application traffic back to the last known-good old EU production app path.
4. Preserve RU logs, RU DB state, and the pre-cutover dump for forensic comparison.
5. Do not delete Supabase or the old EU production app during rollback.
```

- [ ] **Step 3: Mark the cutover outcome honestly**

Record one of:

```markdown
Status: In 72-hour observation
```

or

```markdown
Status: Rolled back
```

Expected:
- the report makes the real operational state explicit

- [ ] **Step 4: Final verification**

Run:

```bash
git diff --check
```

Expected:
- no formatting issues in the report file

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-report.md
git commit -m "docs: finalize phase f cutover report"
```

## Self-Review

### 1. Spec coverage

- Controlled single-window cutover with stepwise Telegram-then-AI switching: covered by Tasks 3 and 4.
- Fresh backup and row-count evidence before cutover: covered by Task 2.
- Public HTTPS readiness requirement for Telegram gateway: covered by Task 1.
- Rollback readiness through the full 72-hour window: covered by Tasks 4 and 5.
- Preservation of Supabase and old EU production path: enforced in Global Constraints and recorded in Tasks 4 and 5.

No Phase F design requirement is left uncovered.

### 2. Placeholder scan

- No `TODO`, `TBD`, or deferred placeholders remain.
- Unknown live values are accessed through existing runtime env or explicit operator-selected public gateway host because those values are not safe to invent in a static plan.
- Each live action includes the exact command or concrete expected state needed to proceed or stop.

### 3. Type consistency

- Health endpoint paths are consistent with the deployed Phase E routes.
- Internal Telegram and AI route paths match the current implementation under `/api/internal/telegram` and `/api/internal/ai`.
- Live file paths match the directories used during Phase E deployment work.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-cutover.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
