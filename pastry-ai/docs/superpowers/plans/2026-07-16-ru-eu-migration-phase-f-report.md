# RU/EU Migration Phase F Report

Date: 2026-07-16
Status: Rolled back

## Cutover Window

- Attempted on 2026-07-16
- Strategy: single cutover window with stepwise Telegram-first switching
- Outcome: rollback executed before entering the 72-hour observation window

## Preflight Evidence

- RU healthcheck before cutover:
  - `GET http://127.0.0.1:3000/api/health/gateway` returned `200 OK`
- EU gateway healthcheck before cutover:
  - `GET http://127.0.0.1:3001/api/health/gateway` returned `200 OK`
- Current production webhook before cutover:
  - `https://y14ls51y1broihq0sxih7nbf.194.113.209.251.sslip.io/api/telegram/webhook`
- Public EU gateway ingress was made production-ready and verified:
  - `https://eu-gateway.194.113.209.251.sslip.io/api/health/gateway` returned `200 OK`
- Parallel EU gateway remained isolated from the old EU production app

Go/No-Go decision at preflight time:

- `GO` for controlled Telegram switch
- based on healthy RU app runtime, healthy EU gateway runtime, public HTTPS ingress availability, and preserved rollback path

## Backup And Snapshot Evidence

- Fresh production dump source:
  - Supabase direct PostgreSQL URL from the old EU production container
- Fresh rollback dump path:
  - `/srv/pastry-ai/backups/pastry-ai-pre-cutover-2026-07-16-public.dump`
- Verified production row counts before switch:
  - `User=4`
  - `Conversation=6`
  - `Message=12`
  - `Payment=0`
  - `UserTariff=3`
  - `TelegramSession=979`
  - `ApiSecret=3`
  - `ScheduledMessage=4`
- RU database was restored from the production `public` schema dump before the switch
- Verified RU row counts after restore:
  - `User=4`
  - `Conversation=6`
  - `Message=12`
  - `Payment=0`
  - `UserTariff=3`
  - `TelegramSession=979`
  - `ApiSecret=3`
  - `ScheduledMessage=4`

## Telegram Switch

- Telegram webhook was temporarily switched to:
  - `https://eu-gateway.194.113.209.251.sslip.io/api/telegram/webhook`
- Telegram API accepted the change and reported the new webhook URL

## Telegram Smoke Tests

- Synthetic public webhook probe to the EU gateway host did not complete successfully
- Direct EU to RU internal Telegram forwarding probe also failed to complete successfully
- Investigation showed the request path was blocked inside the RU application runtime during `prisma.telegramSession.create(...)`

Observed runtime blocker:

- The RU app container could not complete Telegram request processing against local PostgreSQL from the containerized runtime path
- Initial root cause:
  - RU app env used `127.0.0.1:5432`, which is incorrect inside the Docker container
- Follow-up live fixes applied during the attempt:
  - RU app env switched from `127.0.0.1` to host addresses
  - RU PostgreSQL `pg_hba.conf` was widened for the Docker subnet
  - RU PostgreSQL was configured to listen on the Docker bridge address
- Despite those corrections, synthetic Telegram ingress still did not complete successfully within the cutover window

## AI Switch

- No production AI cutover was finalized
- AI gateway infrastructure itself remained healthy
- Because Telegram ingress could not be validated, the overall Phase F cutover was not allowed to proceed into a stable live state

## AI Smoke Tests

- Internal AI gateway path remained reachable and healthy from the gateway runtime
- No new production AI routing state was accepted as final because the cutover was rolled back before observation began

## Rollback Readiness

- Old EU production app remained running throughout the attempt
- Supabase remained untouched as rollback infrastructure
- Pre-cutover production dump was preserved
- Previous Telegram webhook URL was recorded before switch

Rollback executed:

- Telegram webhook was restored to:
  - `https://y14ls51y1broihq0sxih7nbf.194.113.209.251.sslip.io/api/telegram/webhook`
- Telegram API confirmed the old webhook URL after rollback

## Observation Window Start

- Not started
- The 72-hour observation window was not opened because cutover success criteria were not met

## Final Assessment

Phase F cutover attempt on 2026-07-16 was rolled back safely.

What succeeded:

- EU gateway public HTTPS ingress was added and verified
- RU production data restore from Supabase was completed
- RU row counts matched the production snapshot
- Telegram webhook switch and rollback procedures were both executed successfully at the Telegram API level

What blocked successful cutover:

- RU containerized runtime could not complete Telegram request processing against local PostgreSQL quickly enough for a safe cutover
- The blocker persisted after live corrections to DB host addressing and PostgreSQL host access rules

Current state after rollback:

- Production webhook points back to the old EU production application
- Old EU production path remains the active live path
- EU gateway and RU runtime remain available for further debugging
- Supabase remains the rollback source of truth

Recommended next step:

- treat this as a truthful failed cutover rehearsal on live infrastructure
- fix RU app-to-PostgreSQL runtime connectivity for containerized Telegram handling before the next Phase F attempt

Follow-up note:

- a same-day recovery and successful retry were later completed
- see `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-f-recovery-report.md`
