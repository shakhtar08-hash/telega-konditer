# RU/EU Migration Phase D Minimal Design

Date: 2026-07-16
Status: Draft for review

## Summary

Phase D introduces a transition-ready application shape for the future split architecture:

- EU handles ingress and public exposure
- RU hosts the main application and PostgreSQL
- the codebase stops assuming Supabase is mandatory
- AI calls move behind a single internal transport boundary
- Telegram and internal service calls gain explicit internal contracts

This phase is intentionally additive and low-risk. It does not cut production traffic over to RU, and it does not require the current deployment to stop working.

## Goal

Prepare the application code and RU deployment artifacts so the next migration phases can switch traffic and providers without a large refactor under pressure.

## Non-Goals

- No production cutover to RU in this phase
- No live webhook move from EU to RU in this phase
- No standalone gateway service deployment in this phase
- No removal of the current direct provider integrations
- No database schema redesign beyond what is needed for configuration and deployment compatibility

## Current Problems

The current codebase still reflects the original single-app + Supabase deployment model:

- `SUPABASE_*` environment variables are treated as mandatory in runtime env loading
- helper modules under `src/lib/supabase/` still signal Supabase as a first-class dependency
- admin settings still expose Supabase-oriented runtime expectations
- Telegram webhook handling lives only as a public route inside the main app
- AI providers call KIE/OpenAI directly from feature code without a central transport boundary
- there is no shared internal auth/config contract for future EU-to-RU service calls
- RU deployment artifacts for the application layer are not checked into the repo

## Recommended Approach

Use an interface-first transition.

Instead of switching behavior abruptly, introduce explicit service boundaries in code while keeping direct mode as the default runtime behavior. This keeps the current environment working and reduces the size of the eventual cutover.

## Target Outcome

After Phase D:

- the app can boot without mandatory Supabase runtime variables
- AI generation flows call one shared transport entrypoint
- AI requests are sanitized before leaving the app
- internal service URLs and shared-secret auth are represented in config
- the codebase contains a minimal RU deployment path for the app
- the current production behavior can still run in direct mode until cutover

## Design

### 1. Runtime configuration model

Refactor environment loading so Supabase-related variables are optional unless a specific module truly needs them.

#### Required runtime baseline

- `DATABASE_URL`
- existing app secrets already required for the current app to run

#### New optional transition variables

- `INTERNAL_API_BASE_URL`
- `INTERNAL_API_SHARED_SECRET`
- `INTERNAL_TELEGRAM_INGRESS_URL`
- `INTERNAL_AI_GATEWAY_URL`
- `APP_REGION`
- `APP_ROLE`

These variables are transitional. In this phase, they enable future routing and verification without forcing a cutover.

#### Behavior

- If internal URLs are absent, the app continues in direct mode.
- If internal URLs are present, the transport layer can route to internal endpoints.
- Supabase keys must no longer block unrelated runtime code paths.

### 2. AI transport boundary

Introduce one shared AI transport entrypoint used by the existing image/text generation flows.

#### Responsibilities

- receive normalized generation payloads
- sanitize the user-controlled prompt inputs
- decide whether to use direct provider mode or internal gateway mode
- preserve existing provider-specific behavior as much as possible

#### Direct mode

The transport calls existing provider implementations directly.

#### Gateway-ready mode

The transport prepares authenticated internal HTTP requests to a future gateway endpoint, but this phase does not require a separate gateway service to be live.

### 3. AI request sanitization

Add a dedicated sanitization layer before outbound AI requests.

#### Objectives

- normalize whitespace and concatenation artifacts
- isolate user input from system/template prompt scaffolding
- prevent accidental hidden prompt additions from creeping in through ad hoc string assembly
- create one clear place to inspect photo-generation payload shaping

#### Scope

This phase does not redesign prompt authoring. It introduces a single function or module responsible for final outbound normalization and prompt safety checks before KIE/OpenAI transport.

### 4. Telegram/internal service contracts

Prepare the codebase for future EU ingress forwarding without changing the public production flow yet.

#### Changes

- define a shared internal-auth mechanism using a header with `INTERNAL_API_SHARED_SECRET`
- introduce internal request verification helpers
- add a minimal internal endpoint shape or service contract for Telegram/event forwarding
- keep the existing public webhook route working

#### Principle

Public entrypoints remain stable. Internal forwarding becomes possible without rewriting business logic later.

### 5. Supabase decoupling

Reduce the visible and runtime coupling to Supabase.

#### Changes

- make `src/lib/env.ts` stop requiring Supabase variables globally
- isolate or de-emphasize `src/lib/supabase/*` helpers so they are no longer part of the default runtime path
- update admin settings UI so it reflects the transition architecture instead of implying Supabase is required for the primary deployment

#### Constraints

No broad deletion is required in this phase. If a helper is still useful for legacy or fallback scenarios, it can remain in the repo as non-default infrastructure.

### 6. RU deployment artifacts

Add a minimal checked-in deployment path for the RU application host.

#### Expected artifacts

- a `docker-compose` file for running the app on RU
- an env template for RU deployment
- volume and/or bind mount expectations for uploads and logs
- clear references to the RU-local PostgreSQL service connection

#### Goals

- enable repeatable app deployment on RU
- reduce manual server-state drift
- prepare for later production cutover

This should be minimal and practical, not a full platform rebuild.

## File/Module Direction

Expected affected areas:

- `src/lib/env.ts`
- `src/lib/supabase/`
- `src/ai/provider/`
- new AI transport/sanitization modules under `src/ai/` or `src/lib/`
- `src/app/api/telegram/webhook/route.ts`
- possible new internal API helpers/routes under `src/app/api/internal/`
- `src/app/admin/settings/page.tsx`
- RU deployment files at repo root or a dedicated `deploy/` directory

Final placement can follow the existing project structure as long as the boundaries are clear.

## Acceptance Criteria

1. The application no longer fails startup solely because `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` are absent.
2. AI generation code uses a shared transport entrypoint rather than calling external providers ad hoc from multiple call sites.
3. Outbound AI requests pass through a dedicated sanitization step.
4. Internal service configuration and shared-secret verification exist in code for future EU-to-RU forwarding.
5. Current direct-mode behavior remains available when internal gateway URLs are not configured.
6. Admin settings no longer present Supabase as a required primary deployment dependency.
7. RU deployment artifacts are committed and sufficient to describe a minimal application launch path.

## Risks

- Over-eager decoupling could break legacy admin or test paths that still assume Supabase helpers.
- If transport boundaries are introduced too low in the stack, duplicated fallback logic may appear.
- If sanitization mutates prompts too aggressively, output quality may regress.

## Mitigations

- keep direct mode as the default path
- apply sanitization narrowly and deterministically
- avoid deleting legacy helpers unless they are proven unused
- verify startup and representative generation flows after the refactor

## Verification Expectations

At minimum, implementation should verify:

- app startup with Supabase envs removed from the active runtime file
- direct-mode AI generation still reaches provider implementations
- sanitization module is exercised by tests or targeted runtime verification
- admin settings still render correctly
- RU deployment artifacts are syntactically valid

## Out of Scope Follow-Up

Later phases can build on this by:

- moving public Telegram ingress to EU-only forwarding
- deploying a separate internal AI gateway
- switching production app hosting to RU
- rotating secrets and replacing credentials exposed during the migration prep process
