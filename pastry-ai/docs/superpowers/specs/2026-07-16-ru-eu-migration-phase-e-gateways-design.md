# RU/EU Migration Phase E Gateways Design

Date: 2026-07-16
Status: Draft for review

## Summary

Phase E deploys the new EU gateway layer without switching live production traffic to it yet.

This phase prepares the foreign-hosted edge components required by the target architecture:

- EU Telegram Gateway
- EU AI Gateway
- EU-side healthchecks
- EU-to-RU authenticated forwarding over WireGuard
- reduced persistence and reduced logging on EU

The current live EU application remains in place during this phase.

## Goal

Bring up and validate the EU gateway contour in parallel with the current production deployment so Phase F can perform a controlled cutover instead of a first-time infrastructure experiment.

## Non-Goals

- No production webhook switch in this phase
- No production AI traffic switch in this phase
- No disabling or deleting the current EU application deployment
- No production cutover to RU in this phase
- No removal of Supabase as rollback infrastructure in this phase

## Current Context

By the end of Phase D:

- RU PostgreSQL 17 and WireGuard are prepared
- staging restore from Supabase has been verified on RU
- the codebase now contains:
  - internal service auth
  - AI sanitization and shared AI transport boundary
  - internal Telegram forwarding route
  - RU deployment artifacts
- the live production app on EU is still the active runtime path

That means the missing layer before cutover is the real EU edge/gateway deployment.

## Recommended Approach

Use a parallel gateway bring-up.

Deploy the new gateway endpoints on the EU server as a separate controllable path while preserving the current live application unchanged. Validate gateway behavior through direct test requests and internal healthchecks before any public production route is repointed.

## Target Outcome

After Phase E:

- EU hosts a deployable Telegram gateway
- EU hosts a deployable AI gateway path
- EU can forward authenticated internal requests to RU over WireGuard
- healthchecks confirm RU reachability and gateway readiness
- EU logging and persistence are constrained for gateway use
- the old EU production application still remains active as the live path

## Design

### 1. EU deployment topology

The EU server should keep the existing Coolify-managed production deployment untouched and add a new gateway-oriented deployment alongside it.

#### Principles

- no destructive changes to the current Coolify setup
- no deletion of existing containers, volumes, or application records
- no global Docker cleanup
- new gateway deployment must be separable from the current live app

#### Acceptable shape

- separate Coolify application/resource for the gateway path, or
- separate gateway deployment under the existing project if isolation is still explicit

The deployment choice should prioritize rollback clarity and operational safety.

### 2. Telegram Gateway behavior

The Telegram gateway must accept Telegram webhook-style requests on EU and forward them immediately to RU through the internal route.

#### Required behavior

- validate Telegram webhook secret when configured
- forward payload to RU internal Telegram endpoint over WireGuard
- attach internal shared-secret auth for RU verification
- avoid request-body persistence on EU
- avoid logging Telegram payload fields on EU
- return a correct HTTP status to the caller

#### RU target

The forwarding target should be the RU internal Telegram endpoint prepared in Phase D:

- `http://10.10.0.1:<app-port>/api/internal/telegram` if the current code path remains under `/api`
- or the exact RU internal route path validated during implementation

The final path must match the current application route implementation, not an older textual example from the migration brief.

### 3. AI Gateway behavior

The AI gateway must accept only internal requests and relay them from EU to the external AI providers without keeping persistent request/response state.

#### Required behavior

- reachable only through the intended internal path
- authenticated with internal shared secret
- no database on EU for AI history
- no prompt/response storage
- no request-body logging
- healthcheck available without exposing sensitive content

#### Request shaping

Phase D already introduced the shared transport and sanitization boundary in code. Phase E should deploy the EU-side receiving path so RU can later switch from direct provider calls to EU gateway routing in Phase F with minimal code/runtime change.

### 4. Internal auth and network contract

Every EU-to-RU gateway call must be protected by:

- WireGuard private routing
- shared internal secret

#### Requirements

- RU internal routes must reject unauthenticated requests
- EU gateway config must store the shared secret in environment secrets only
- no shared secret in repo files, compose files with real values, or logs

### 5. Logging and persistence restrictions on EU

The EU server is an edge/gateway host, not a user-data host.

#### Required restrictions

- no persistent storage of Telegram update bodies
- no persistent storage of AI prompts or AI responses
- no application logs with request payloads
- no accidental debug logging of internal request bodies

#### Allowed logging

Minimal technical logs are acceptable, for example:

- timestamp
- route
- status code
- duration
- generic request ID
- provider error code

No user identifiers or message text should appear in gateway logs.

### 6. Healthchecks

Phase E must include non-sensitive health verification for the new EU gateway path.

#### Minimum checks

- EU Telegram gateway healthcheck
- EU AI gateway healthcheck
- RU app reachability from EU over WireGuard
- internal auth validation path

#### Constraints

Healthcheck responses must not expose secrets, payloads, prompts, or user data.

### 7. Coexistence with the current production EU app

Phase E must not replace the existing production route yet.

#### Explicit rule

- existing EU production application stays deployed and active
- new gateway path is validated in parallel
- production webhook and production AI routing remain unchanged until Phase F

This separation is the main safety property of the phase.

## Operational Plan Shape

Phase E implementation should follow this sequence:

1. inventory the current EU Coolify application/resources again before changes
2. create the gateway deployment path on EU
3. configure secrets and internal target URLs
4. verify WireGuard routing from EU gateway to RU internal endpoints
5. run non-production gateway test requests
6. verify healthchecks and logging constraints
7. document exact deployment names, ports, URLs, and rollback steps

## Acceptance Criteria

1. A new EU gateway deployment exists alongside the current EU production application.
2. Telegram-style requests can be forwarded from EU to RU internal Telegram endpoint in test mode.
3. AI gateway path exists on EU and can accept authenticated internal requests in test mode.
4. EU-to-RU gateway forwarding uses WireGuard plus shared-secret auth.
5. EU gateway configuration does not introduce persistent user-data storage.
6. No payload/body logging is present in the intended EU gateway path.
7. Existing EU production application remains intact and active after Phase E.

## Risks

- Accidental interference with the current Coolify production deployment
- Gateway deployment sharing the wrong environment or port with the current app
- Hidden logging of Telegram or AI payloads in framework or proxy defaults
- Misaligned internal route paths between EU forwarding config and RU application code

## Mitigations

- deploy gateway as a separate, clearly named EU resource
- verify route/port mapping before exposing any path
- inspect container/proxy logging behavior explicitly
- test only with non-production forwarding before Phase F

## Verification Expectations

At minimum, implementation should verify:

- EU gateway deployment starts successfully
- RU internal Telegram endpoint is reachable from EU over WireGuard
- internal auth rejects wrong secret and accepts correct secret
- healthcheck endpoints respond successfully
- gateway logs do not include payload bodies during test requests

## Out of Scope Follow-Up

Later phases can build on this by:

- repointing the real Telegram webhook to the new EU gateway
- routing production AI traffic through the EU gateway
- switching live runtime authority to RU
- beginning the 72-hour post-cutover observation window
