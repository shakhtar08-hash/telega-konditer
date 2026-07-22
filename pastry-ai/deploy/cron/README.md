# Cron Deployment

This directory defines the explicit cron runtime for RU trigger processing.

## Role

- `APP_ROLE=cron`
- `APP_REGION=ru`
- no public reverse-proxy exposure
- only one scheduler should call `/api/cron/process-triggers`

## Start

1. Copy `deploy/cron/.env.example` from the RU deployment shape or create `deploy/cron/.env`.
2. Set `APP_ROLE=cron` and `APP_REGION=ru`.
3. Run `docker compose -f deploy/cron/docker-compose.yml up -d --build`.
4. Make sure the shared RU app network `ru_default` exists before first start, because cron joins that network to reach the host-local Postgres listener.

## Notes

- The current implementation still uses the same Next.js server process, but this runtime is isolated by role and only binds to `127.0.0.1:3002`.
- A host cron job or systemd timer should call `http://127.0.0.1:3002/api/cron/process-triggers` with `Authorization: Bearer <CRON_SECRET>`.
- Do not run the scheduler from the RU app runtime and the cron runtime at the same time.
- The current trigger processor does not yet implement an execution lock, so the deployment must preserve a single active scheduler.
