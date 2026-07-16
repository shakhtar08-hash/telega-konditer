# RU deployment

This directory contains a minimal RU deployment path for the app container used in the Phase D transition architecture. It keeps the current direct runtime behavior and adds the internal transition variables required for the RU/EU layout.

## Files

- `docker-compose.yml` builds the app from the repository root and mounts persistent uploads and logs.
- `.env.example` lists the runtime values required by the RU app container today, including the still-required Supabase variables and the new transition variables.

## Start

1. Copy `deploy/ru/.env.example` to `deploy/ru/.env`.
2. Fill in the real secrets and URLs.
3. Run `docker compose -f deploy/ru/docker-compose.yml up -d --build`.

## Notes

- `APP_REGION=ru` and `APP_ROLE=app` match the RU app role for this phase.
- The current startup contract still requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` together because the app boot path still validates full Supabase config in Phase D.
- `INTERNAL_API_BASE_URL`, `INTERNAL_TELEGRAM_INGRESS_URL`, and `INTERNAL_AI_GATEWAY_URL` can point to the same app during the transition because this task does not cut over runtime behavior.
- This is a transition deployment: the runtime view has moved to RU/EU-oriented keys, but the checked-in RU sample env must still satisfy the present boot requirements until a later cutover removes that dependency.
