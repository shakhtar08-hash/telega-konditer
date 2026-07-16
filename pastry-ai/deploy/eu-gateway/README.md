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

## Start

1. Copy `deploy/eu-gateway/.env.example` to `deploy/eu-gateway/.env`.
2. Fill in the real secrets and URLs for the EU gateway environment.
3. Run `docker compose -f deploy/eu-gateway/docker-compose.yml up -d --build`.

## Notes

- `APP_REGION=eu` and `APP_ROLE=ingress` identify this as the EU gateway role.
- The current startup contract still requires the full Supabase triple, so those values remain in the template.
- `INTERNAL_API_BASE_URL`, `INTERNAL_TELEGRAM_INGRESS_URL`, and `INTERNAL_AI_GATEWAY_URL` are transition values and should point to the current internal endpoints until a later phase changes traffic.
- This deployment coexists with the current EU production app; it does not disable, delete, or cut over the existing live deployment.
