# RU/EU Migration Phase F Recovery Report

Date: 2026-07-16
Status: Completed

## Recovery Summary

- This report covers the successful same-day retry after the earlier rolled-back Phase F attempt
- Telegram ingress is now cut over to the EU gateway
- RU application runtime is processing Telegram traffic against the restored RU PostgreSQL database successfully

## Confirmed Root Cause

- The primary blocker was host firewall policy on the RU server, not Prisma logic and not the EU gateway
- RU PostgreSQL was listening on the Docker bridge host address `172.18.0.1:5432`
- The RU app container was running on bridge subnet `172.18.0.0/16`
- RU host firewall policy had `INPUT DROP`
- `ufw` allowed PostgreSQL ingress from `10.10.0.2`, but not from the Docker bridge subnet
- Result:
  - container TCP connections to `172.18.0.1:5432` timed out
  - Prisma surfaced the failure as `P1008` during Telegram session writes

## Recovery Actions

- Confirmed PostgreSQL listener availability on:
  - `127.0.0.1:5432`
  - `10.10.0.1:5432`
  - `172.18.0.1:5432`
- Confirmed Docker bridge network details:
  - network `ru_default`
  - host gateway `172.18.0.1`
  - RU app container address `172.18.0.2`
- Confirmed RU firewall policy gap:
  - `ufw` rule existed for `5432/tcp` from `10.10.0.2`
  - no matching allow rule existed for `172.18.0.0/16`
- Applied live firewall fix on RU:
  - `ufw allow proto tcp from 172.18.0.0/16 to any port 5432`

## Verification Evidence

- Direct TCP probe from the RU app container to PostgreSQL host address succeeded after the firewall fix:
  - `172.18.0.1:5432 open`
- Direct PostgreSQL query from inside the RU app container succeeded:
  - `select 1 as ok` returned `[{"ok":1}]`
- Synthetic RU internal Telegram ingress succeeded:
  - `POST http://127.0.0.1:3000/api/internal/telegram` returned `200 OK`
- Synthetic public EU gateway webhook succeeded:
  - `POST https://eu-gateway.194.113.209.251.sslip.io/api/telegram/webhook` returned `200 OK`

## Production Cutover Completion

- Telegram webhook was switched back to the EU gateway production URL:
  - `https://eu-gateway.194.113.209.251.sslip.io/api/telegram/webhook`
- Telegram API confirmed the new live webhook:
  - `getWebhookInfo.url=https://eu-gateway.194.113.209.251.sslip.io/api/telegram/webhook`
  - `pending_update_count=0`
  - `ip_address=194.113.209.251`

## Final State

- EU gateway is the active public Telegram ingress
- RU application is the Telegram processing runtime behind the gateway
- RU PostgreSQL contains the restored production dataset used for cutover
- The old EU production app is no longer the active Telegram webhook target

## Recommendation

- Keep the RU firewall allow rule for the Docker bridge subnet as part of the active production topology
- Carry this requirement into any future RU host reprovisioning or firewall hardening work
