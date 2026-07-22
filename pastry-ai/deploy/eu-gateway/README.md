# EU gateway deployment

This directory contains the checked-in EU gateway deployment artifacts for Phase E.
It is meant to run alongside the current EU production application, not replace it.

## What this deployment is for

- Provides a separate gateway-oriented container path for the EU side of the migration.
- Keeps the current EU production app active and untouched.
- Avoids any live webhook switch, AI traffic switch, or production cutover in this phase.
- Preserves Supabase as rollback infrastructure for the transition.

## Files

- `docker-compose.yml` builds the app from the repository root for a separate gateway container.
- `.env.example` lists the runtime values needed for the gateway path, including the transition variables required by the current app contract.
- `GATEWAY_PUBLIC_HOST` defines the public HTTPS hostname that Traefik should expose for production webhook ingress.

## Start

1. Copy `deploy/eu-gateway/.env.example` to `deploy/eu-gateway/.env`.
2. Fill in the real secrets and URLs for the EU gateway environment.
3. Run `docker compose -f deploy/eu-gateway/docker-compose.yml up -d --build`.

## Notes

- `APP_REGION=eu` and `APP_ROLE=ingress` identify this as the EU gateway role.
- `GATEWAY_PUBLIC_HOST` should be a public hostname that resolves to the EU server and can receive a TLS certificate through the existing reverse proxy.
- The ingress runtime can now start without `DATABASE_URL` and `DIRECT_URL`, but the checked-in template may still carry transitional values until the EU deployment env is cleaned up.
- `INTERNAL_API_BASE_URL`, `INTERNAL_TELEGRAM_INGRESS_URL`, and `INTERNAL_AI_GATEWAY_URL` are transition values and should point to the current internal endpoints until a later phase changes traffic.
- This deployment coexists with the current EU production app; it does not disable, delete, or cut over the existing live deployment.
- In ingress mode, the public `/api/telegram/webhook` route forwards the raw Telegram update to RU over WireGuard instead of processing the bot update locally on EU.
- On 2026-07-21, the Coolify/Traefik proxy was replaced by `deploy/eu-caddy/` (Caddy) on ports 80/443. The Caddy stack is the live public edge. Traefik (`coolify-proxy`) is stopped.
- The old legacy Coolify application container has been retired after the 72-hour observation window.
