# RU/EU Migration Phase E Report

Date: 2026-07-16
Status: Blocked / Partially Complete

## Inventory Before Changes

- EU host: `194.113.209.251`
- Existing EU production app container: `y14ls51y1broihq0sxih7nbf-214210046769`
- Existing EU production app commit before Phase E work: `9dd99fa6298ba344e5a8d446a933c952058fe989`
- Local source commit used for the parallel EU gateway deployment attempt: `5940b380526211408ea8a40f247fcea5996431f6`
- WireGuard on EU was up during execution
- Existing EU production application remained the active live path before and after this task

Observed live EU state before changes:

- Coolify infrastructure containers were running
- Existing production application container was running
- No production cutover to RU had been performed

## EU Gateway Deployment

Succeeded on EU:

- A separate parallel EU gateway container was created and started:
  - `pastry-ai-eu-gateway-pastry-ai-eu-gateway-1`
- The parallel gateway is exposed on:
  - `http://194.113.209.251:3001`
- Gateway healthcheck responded successfully:

```json
{"checks":{"aiGatewayConfigured":true,"internalSecretConfigured":true},"status":"ok"}
```

- Existing EU production app remained untouched at commit `9dd99fa6298ba344e5a8d446a933c952058fe989`
- No existing EU Coolify production deployment was disabled, deleted, or repointed

## WireGuard And Internal Auth Verification

Confirmed from direct verification on 2026-07-16:

- From EU, `10.10.0.1:5432` is reachable
- From EU, `10.10.0.1:3000` is closed
- On RU host `159.194.206.106`, PostgreSQL listens on:
  - `127.0.0.1:5432`
  - `10.10.0.1:5432`
- On RU host there is no Docker runtime installed
- On RU host there is no application listener on port `3000`

Internal-path verification state:

- EU gateway health route: PASS
- EU internal auth rejection behavior: PASS for direct unauthorized probes
- EU to RU application forwarding validation: BLOCKED because RU has no app deployment listening on `10.10.0.1:3000`

## Healthchecks

Verified endpoint:

- `GET http://194.113.209.251:3001/api/health/gateway`

Observed result:

```json
{"checks":{"aiGatewayConfigured":true,"internalSecretConfigured":true},"status":"ok"}
```

Interpretation:

- The EU parallel gateway runtime is up
- The gateway runtime sees AI gateway configuration
- The gateway runtime sees internal shared-secret configuration
- This does not prove EU to RU forwarding readiness because RU app deployment is absent

## Logging Review

Observed concern:

- EU AI gateway error-path logs currently include `requestBodyValues.prompt` on OpenAI billing failure

Observed probe prompts that appeared in logs:

- `phase-e-ai-probe-20260716`
- `phase-e-ai-probe-20260716-status`

Assessment:

- This does not meet the intended Phase E expectation that EU gateway logs should not include request payload content on error paths
- Full EU gateway validation is blocked until this logging behavior is fixed

## Production Safety Checks

Confirmed constraints preserved:

- No production webhook switch was performed
- No production AI traffic switch was performed
- No disabling or deleting of the current EU application deployment was performed
- No production cutover to RU was performed
- No removal of Supabase as rollback infrastructure was performed
- No destructive Docker cleanup commands were run
- No existing Coolify resources or volumes were deleted

## Rollback Notes

Rollback was not executed during this task.

If the parallel EU gateway bring-up needs to be backed out later, only the separate gateway container/deployment should be removed. The existing Coolify-managed EU production application should remain untouched.

Because no production cutover occurred in this phase, rollback scope is limited to the separate EU gateway deployment created for verification.

## Final Assessment

Phase E Task 4 is only partially complete.

What is complete:

- EU state inventory
- Separate EU parallel gateway bring-up
- EU gateway healthcheck verification
- Confirmation that production EU remained untouched
- Identification of the current live blockers

What blocks full validation:

- RU app deployment does not yet exist on `159.194.206.106`, and there is no app listener on `10.10.0.1:3000`
- Therefore full EU to RU Telegram/internal gateway forwarding cannot be validated yet
- EU AI gateway error-path logs currently leak prompt content and must be fixed before this phase can be considered fully validated

Conclusion:

- This task should be reported as a truthful blocked-phase execution report
- Phase E cannot be considered fully validated until:
  - the RU app deployment exists and listens on the expected internal WireGuard app port
  - EU payload logging on AI error paths is fixed
