# RU/EU Migration Phase F Cutover Design

Date: 2026-07-16
Status: Draft for implementation

## Summary

Phase F performs the first controlled production cutover from the current EU-hosted application path to the target split architecture:

- EU remains the public ingress edge
- RU becomes the primary application and database runtime
- Telegram enters through the EU gateway and forwards to RU
- AI traffic leaves through the EU gateway path
- Supabase and the old EU production application remain available for rollback during a 72-hour observation window

This phase is operationally sensitive. It should be treated as a controlled migration window with explicit go/no-go gates and a fully prepared rollback path.

## Goal

Cut production traffic over to the RU application and RU database with the smallest practical blast radius, while preserving fast rollback to the previous EU + Supabase path for 72 hours.

## Non-Goals

- No destructive shutdown of Supabase during this phase
- No deletion of the current EU production application during this phase
- No long-term cleanup of legacy configuration during this phase
- No major feature development unrelated to cutover readiness
- No permanent rollback decisions during the first observation window

## Current Context

By the end of Phase E on 2026-07-16:

- RU application runtime is deployed and healthy on `http://10.10.0.1:3000`
- RU PostgreSQL is already prepared and reachable over WireGuard
- EU parallel gateway runtime is deployed and healthy on `http://194.113.209.251:3001`
- EU to RU internal forwarding is working over WireGuard
- AI gateway error-path responses are sanitized and no longer leak probe prompt text in intended gateway logs
- the existing EU production application remains active and unchanged at commit `9dd99fa6298ba344e5a8d446a933c952058fe989`

The missing work is no longer infrastructure bring-up. The remaining work is safe production switching.

## Recommended Approach

Use one controlled cutover window with stepwise switching inside the window.

The recommended order is:

1. freeze and preflight validation
2. fresh production backup and reconciliation snapshot
3. final RU restore verification
4. switch public Telegram ingress to the EU gateway path
5. run Telegram-focused smoke tests
6. switch production AI routing to the EU gateway path
7. run broader application smoke tests
8. enter a 72-hour observation window

This avoids one large opaque switch while keeping organizational overhead lower than splitting the work across multiple days.

## Target Outcome

After Phase F:

- production Telegram ingress terminates on EU gateway infrastructure
- EU gateway forwards internally to the RU application
- production application behavior runs against the RU database and RU app
- production AI traffic uses the gateway path instead of direct provider egress from the legacy EU production app
- Supabase and the old EU production path remain rollback-ready for 72 hours

## Design

### 1. Cutover Shape

Phase F is a reversible operational switch, not a cleanup phase.

#### Rules

- every externally visible switch must have a matching rollback step
- the old EU production application must stay intact during the observation window
- Supabase must remain untouched as a rollback source of truth during the observation window
- no irreversible cleanup is allowed before Phase G

#### Principle

The migration is considered successful only after the 72-hour window closes, not at the moment the switch is flipped.

### 2. Mandatory Preflight Gates

Cutover must not start until all required gates are green.

#### Required gates

- RU app healthcheck is green
- EU gateway healthcheck is green
- EU to RU internal Telegram reachability is green
- EU to RU internal AI gateway reachability is green
- RU database connection uses the intended production credentials
- fresh rollback snapshot plan is verified and writable
- current Telegram webhook state is recorded
- public HTTPS routing for the EU gateway is confirmed and suitable for Telegram webhook delivery
- rollback operator can still reach both servers and both old/new app paths

#### Important operational nuance

The parallel EU gateway listener on port `3001` was sufficient for Phase E verification but is not, by itself, a production Telegram webhook target. Phase F must ensure that the EU gateway is available through a stable public HTTPS route that Telegram can call reliably.

### 3. Data Safety Model

The last pre-cutover production snapshot is the rollback anchor.

#### Requirements

- take a fresh logical dump immediately before switch actions
- record per-table row counts for critical public tables before restore verification
- record the exact RU restore target state used for cutover
- preserve the dump and row-count evidence for the full observation window

#### Critical tables

At minimum the evidence set should include:

- `User`
- `Conversation`
- `Message`
- `Payment`
- `UserTariff`
- `TelegramSession`
- `ApiSecret`
- `ScheduledMessage`
- trigger-related tables used by the current production flows

### 4. Telegram Cutover

Telegram moves first inside the cutover window.

#### Why first

- it is the most externally sensitive live ingress
- it has the clearest end-to-end verification path
- separating it from AI reduces ambiguity during incident handling

#### Production target

The public Telegram webhook must point to the EU gateway path, not directly to the RU application.

#### Expected internal flow

1. Telegram sends to EU public HTTPS endpoint
2. EU gateway validates public ingress expectations
3. EU gateway forwards to RU internal Telegram endpoint over WireGuard
4. RU validates the internal shared secret
5. RU handles deduplication and background bot processing

### 5. AI Cutover

AI routing switches only after Telegram smoke tests pass.

#### Expected runtime behavior

- RU application remains the main feature runtime
- RU AI transport sends authenticated internal requests to the EU gateway path
- EU gateway performs outbound provider calls and returns sanitized responses

#### Safety properties

- no prompt bodies should appear in intended EU gateway logs
- failed provider responses should stay generic at the internal boundary
- rollback can return AI routing to the old path without immediately undoing Telegram if needed

### 6. Smoke Test Model

Phase F requires two test layers.

#### Layer A: immediately after Telegram switch

- webhook registration is confirmed
- a controlled Telegram test update reaches RU successfully
- duplicate handling still works
- no gateway auth failures appear in expected logs

#### Layer B: after AI routing switch

- internal AI probe succeeds or fails in the expected sanitized way
- RU app can still serve normal health and admin access
- trigger/cron-sensitive routes remain reachable with current secrets

### 7. Rollback Model

Rollback must be explicit, fast, and asymmetric.

#### Immediate rollback triggers

- Telegram updates stop reaching RU
- repeated unauthorized forwarding failures
- RU app healthcheck instability
- database mismatch evidence after switch
- AI gateway begins exposing payload content or repeatedly fails unexpectedly

#### Rollback order

1. stop new traffic from relying on the broken target
2. repoint Telegram webhook back to the last known-good public endpoint
3. restore application routing and env to the pre-cutover production path
4. keep RU state and logs for forensic analysis
5. keep Supabase intact as the rollback authority

Rollback should favor restoring service first and investigating second.

### 8. Observation Window

The observation window lasts 72 hours.

#### During the window

- old EU production deployment stays available for rollback
- Supabase remains untouched as rollback infrastructure
- no destructive cleanup commands are allowed
- operational notes should capture incidents, anomalies, and final acceptance signals

### 9. Phase Exit

Phase F is complete only when:

- production traffic has been switched
- smoke tests have passed
- rollback remains available
- the system enters the 72-hour observation window with no immediate blockers

Phase G then decides whether the cutover becomes permanent.

## Acceptance Criteria

1. A fresh production backup and row-count evidence set are captured immediately before cutover.
2. EU gateway has a production-ready public HTTPS ingress path for Telegram.
3. Production Telegram webhook points to the EU gateway path after cutover.
4. RU application and RU database serve the primary runtime after cutover.
5. Production AI routing uses the internal gateway path after the second switch step.
6. Smoke tests pass for Telegram, healthchecks, and AI path behavior.
7. Supabase and the old EU production path remain rollback-ready for 72 hours.

## Risks

- Telegram webhook target could be switched before public EU gateway ingress is truly ready.
- RU runtime and RU database state could drift from the final production snapshot.
- AI routing and Telegram routing could fail for different reasons and become hard to diagnose if switched simultaneously.
- Operators could lose rollback speed if the old EU path is modified too aggressively during the window.

## Mitigations

- enforce hard preflight gates
- take a fresh backup immediately before switching
- switch Telegram before AI
- preserve the old EU production path unchanged
- keep rollback commands and evidence ready before any public switch action

## Verification Expectations

At minimum, Phase F execution should verify:

- RU app healthcheck
- EU gateway healthcheck
- current and new Telegram webhook info
- row-count parity for critical tables after final RU restore verification
- Telegram end-to-end delivery after cutover
- internal AI response sanitization after cutover
- rollback readiness at the start of the 72-hour window

## Out of Scope Follow-Up

Later phases can build on this by:

- removing obsolete Supabase runtime dependencies after stability is confirmed
- rotating all exposed or transitional secrets
- retiring the old EU production application after the observation window
- hardening firewall and operator access around the final architecture
