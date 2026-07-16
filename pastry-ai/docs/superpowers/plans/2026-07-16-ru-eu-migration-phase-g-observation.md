# RU/EU Migration Phase G Observation Report

Date: 2026-07-16
Status: In progress

## Scope

- Phase G begins after the successful Phase F cutover
- This phase covers:
  - the 72-hour observation window
  - keeping Supabase online for rollback only
  - rotating exposed or legacy secrets after stability confirmation
  - removing obsolete Supabase runtime dependencies after stability confirmation

## Observation Window

- Observation window start:
  - `2026-07-16T20:45:40Z`
- Earliest observation window end:
  - `2026-07-19T20:45:40Z`

## Live State At Phase G Start

### RU runtime

- `GET http://127.0.0.1:3000/api/health/gateway` returned `200 OK`
- Response body:
  - `{"checks":{"aiGatewayConfigured":true,"internalSecretConfigured":true},"status":"ok"}`
- RU app container state:
  - `ru-pastry-ai-1 Up 24 minutes`
- RU database probe from inside the app container succeeded:
  - `select count(*)::int as users from "User"` returned `[{"users":4}]`

### EU gateway

- `GET http://127.0.0.1:3001/api/health/gateway` returned `200 OK`
- `GET https://eu-gateway.194.113.209.251.sslip.io/api/health/gateway` returned `200 OK`
- Response body:
  - `{"checks":{"aiGatewayConfigured":true,"internalSecretConfigured":true},"status":"ok"}`
- EU gateway container state:
  - `pastry-ai-eu-gateway-pastry-ai-eu-gateway-1 Up 45 minutes`

### Telegram ingress

- Telegram `getWebhookInfo` confirmed the active live webhook:
  - `https://eu-gateway.194.113.209.251.sslip.io/api/telegram/webhook`
- Confirmed Telegram state:
  - `pending_update_count=0`
  - `ip_address=194.113.209.251`
  - `allowed_updates=["message","callback_query"]`

### Rollback posture

- Old EU production app is still running:
  - `y14ls51y1broihq0sxih7nbf-214210046769 Up 4 hours`
- Supabase is still retained as rollback infrastructure
- No destructive cleanup has been performed

## Phase G Rules

- Do not delete Supabase during the observation window
- Do not shut down the old EU production app during the observation window
- Do not remove transitional runtime configuration during the observation window
- Treat any recurring webhook delivery issue, RU database instability, or gateway health regression as a rollback trigger

## Deferred Until After Stability Confirmation

- Rotate exposed or legacy secrets
- Remove obsolete Supabase runtime dependencies from the active runtime path
- Decide whether the old EU production app can be retired

## Next Checkpoint

- Re-run health, webhook, and rollback-readiness checks after the 72-hour window closes
- If the system remains stable through `2026-07-19T20:45:40Z`, Phase G can proceed to:
  - secret rotation
  - Supabase dependency cleanup
  - old EU production retirement planning
