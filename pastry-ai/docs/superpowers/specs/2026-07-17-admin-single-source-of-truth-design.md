# Admin Single Source of Truth Design

Date: 2026-07-17
Status: Approved design for implementation

## Summary

The current RU/EU production topology has one live bot/runtime source of truth in RU, while multiple EU admin screens still read from and write to their own local database connection.

This causes split-brain behavior:

- the bot can use one dataset
- the EU admin can show another dataset
- edits in the admin can appear successful while not affecting live runtime behavior

The first migration stage in this design removes that split for all data-driven admin domains without deleting old EU-local state yet.

After this stage:

- EU remains the public admin entrypoint
- RU remains the only live runtime and database authority
- all admin reads and writes that affect live behavior flow through RU
- EU local admin data is no longer authoritative, even if it still exists temporarily

## Goal

Move the full data-driven admin surface to a single production source of truth in RU by routing all admin reads and mutations through internal admin APIs instead of letting EU ingress pages use their own local Prisma data path.

## Non-Goals

- No immediate deletion of the old EU-local database state
- No new product behavior unrelated to migration safety
- No redesign of the Telegram runtime flow
- No separate admin service extraction in this stage
- No infrastructure cleanup of legacy Coolify projects in this stage
- No removal of Supabase rollback assets during this stage

## Problem Statement

The current production split is asymmetric:

- public admin access enters through EU
- live Telegram processing and runtime logic execute in RU
- some admin screens already bridge to RU
- many others still use the local EU database connection

This makes the system operationally unsafe because a successful admin action does not reliably mean that the live bot will see the same data.

Known example:

- `users` was corrected by bridging EU admin actions and reads to RU
- `funnel` and onboarding still show the classic failure mode where the bot reads RU `funnelStep` data while EU admin edits EU-local `funnelStep` data

The same class of bug can repeat anywhere an admin page still talks to local Prisma on EU ingress.

## Target Outcome

Once this stage is complete:

- every data-driven admin page on EU ingress reads from RU
- every admin mutation on EU ingress writes to RU
- the RU runtime database is the only live admin source of truth
- the live bot, admin UI, and background workflows all observe the same records
- any remaining EU-local admin data is inert and can be cleaned up later

## Recommended Approach

Use a domain-based internal admin bridge.

For each admin domain:

1. move data access into a shared service layer
2. expose RU-only internal admin API endpoints for reads and writes
3. make EU ingress pages and server actions call that bridge whenever `APP_ROLE=ingress`
4. preserve the local service implementation for RU runtime and local development

This extends the pattern already proven for `users` and avoids a fragile full-page reverse proxy or a rushed standalone admin backend.

## Alternatives Considered

### 1. Full `/admin` reverse proxy to RU

Rejected for this stage.

It hides the split at the network layer instead of fixing the data access model, complicates auth and debugging, and makes partial verification harder.

### 2. Immediate dedicated admin backend service

Rejected for this stage.

It may be a good future direction, but it increases migration scope and operational risk during an already sensitive production transition.

### 3. Domain-by-domain symptom fixes only

Rejected for this stage.

This is what created the current state: `users` works, but `funnel` diverges. The next hidden divergence would simply appear somewhere else.

## Scope of Stage 1

Stage 1 covers all data-driven admin surfaces that read or mutate live operational data.

### Included domains

- `users`
- `user-groups`
- `dynamic-user-groups`
- `tariffs`
- `funnel`
- `chat-bot` menu and text blocks
- `photo-styles`
- `prompts`
- `triggers`
- `settings` secrets stored in the application database
- other admin CRUD pages that still access Prisma directly and affect live runtime behavior

### Included page classes

- list pages
- detail pages
- create forms
- update forms
- delete actions
- test-send or preview-backed actions that depend on live admin data

### Excluded pages in this stage

- purely static admin navigation
- local-only UI helpers with no data access
- infrastructure cleanup tasks
- runtime features that are not part of the admin CRUD path unless the admin explicitly controls them

## Domain Inventory Baseline

The implementation must start from a complete inventory of all Prisma-backed admin entrypoints.

At minimum, the current codebase already shows direct admin Prisma access in these areas:

- `/admin`
- `/admin/chat-bot`
- `/admin/dynamic-user-groups`
- `/admin/dynamic-user-groups/[groupId]`
- `/admin/funnel`
- `/admin/history`
- `/admin/photo-styles`
- `/admin/prompts`
- `/admin/settings`
- `/admin/tariffs`
- `/admin/triggers`
- `/admin/triggers/new`
- `/admin/triggers/[triggerId]`
- `/admin/usage`
- `/admin/user-groups`
- `/admin/user-groups/[groupId]`

The inventory should also include server actions and helper loaders under `src/app/admin/_lib` and any admin-related feature modules that still read from Prisma directly.

## Architecture

### EU ingress role

EU remains:

- public HTTPS entrypoint for admin
- place where admin auth and session UI terminate
- rendering shell for admin pages

EU no longer remains:

- an authoritative source of admin data for live behavior

### RU app role

RU becomes:

- the only live admin data authority
- the only source of truth for records that affect bot/runtime behavior
- the host for internal admin read and mutation endpoints

### Shared domain pattern

Each migrated domain follows the same structure:

1. `service` module
   - owns local business logic and Prisma access
2. `internal-admin-client` module
   - owns bridge calls from EU ingress to RU
3. `internal admin API route(s)`
   - expose RU data to trusted internal callers
4. `page` and `actions`
   - choose bridge vs local service based on runtime role

This pattern keeps the migration legible and minimizes one-off logic.

## Request Flow

### Reads on EU ingress

1. admin opens a page on EU
2. page detects `APP_ROLE=ingress` and bridge configuration
3. page fetches the domain-specific data from RU internal admin API
4. RU service loads from its local Prisma and returns serialized data
5. EU renders using RU-backed data

### Mutations on EU ingress

1. admin submits a form on EU
2. server action detects `APP_ROLE=ingress`
3. server action posts the mutation payload to RU internal admin API
4. RU service executes the mutation against RU Prisma
5. EU revalidates the affected admin paths
6. subsequent reads reflect RU state

### Reads and writes on RU/local development

When the app is not running as ingress, the page or action uses the local service directly. This preserves local development ergonomics and keeps RU self-contained.

## Internal API Design Rules

The internal admin bridge should follow consistent rules across domains.

### Authentication

- all internal admin endpoints require `INTERNAL_API_SHARED_SECRET`
- requests are accepted only from trusted internal callers
- endpoints are not public admin APIs

### Shape

- prefer domain-specific endpoints over one generic opaque endpoint
- read endpoints may return page-shaped data when that keeps migration simple
- mutation endpoints may use a small action dispatcher per domain when forms are closely related

### Serialization

- dates must be serialized explicitly and revived on the EU side
- nullable fields must be preserved faithfully
- enum-like string values must remain stable between RU services and EU pages

## Admin Auth Model

Admin login/session remains on EU for this stage.

This means:

- the browser continues to authenticate to EU admin pages
- EU server actions remain the trusted bridge caller
- RU internal endpoints do not need public browser-facing admin auth in this stage

This keeps the migration narrower and avoids mixing session redesign into the data-source cutover.

## Data Consistency Rules

A domain is not considered migrated until both of these are true:

- all reads for that domain come from RU
- all writes for that domain go to RU

Partial migration is explicitly not accepted.

Examples:

- list page bridged but detail page still local: not migrated
- create/update bridged but delete still local: not migrated
- page bridged but helper loader still local: not migrated

## Domain Rollout Order

The implementation should group work by domain, not by file type.

Recommended order:

1. finish and harden `users` as the reference pattern
2. migrate `funnel`
3. migrate `chat-bot`
4. migrate `photo-styles`
5. migrate `prompts`
6. migrate `triggers`
7. migrate `user-groups`
8. migrate `dynamic-user-groups`
9. migrate `tariffs`
10. migrate `settings`
11. migrate dashboard and reporting pages that still read local Prisma

This order prioritizes the pages most likely to affect visible bot behavior first.

## Error Handling

The bridge must fail visibly and safely.

### Expected failure cases

- internal admin bridge is not configured
- RU internal endpoint returns non-200
- payload shape mismatch
- RU domain service throws validation error
- bridge timeout or network failure

### Rules

- no silent fallback from EU ingress to local Prisma for migrated domains
- bridge failures should surface as explicit admin errors
- if a domain is migrated, local EU state must never become an emergency implicit fallback

This rule is essential because silent fallback would recreate split-brain behavior.

## File and Upload Semantics

Some admin domains include image or media fields.

Rules for this stage:

- image-path-only edits must affect RU-backed data immediately
- if an action uploads a file and stores a path, the resulting persisted record must be RU-authoritative
- any temporary EU-side file handling must not result in metadata being saved only to EU-local state

If a domain cannot satisfy this safely in one pass, its upload path should be moved together with the domain mutation path, not left half-local.

## Testing Strategy

### Domain-level verification

Every migrated domain must be verified for:

- list page read
- detail page read, if applicable
- create
- update
- delete
- revalidation behavior

### Runtime alignment checks

For domains that affect live bot behavior, verification must also prove that runtime sees the same data after admin mutation.

Examples:

- onboarding/funnel edits are reflected in `/start`
- chat-bot menu edits are reflected in the live bot menu
- prompt/style updates are seen by the runtime path that uses them
- trigger edits affect the trigger runtime dataset

### Regression tests

Add or update tests to cover:

- bridge client serialization and deserialization
- internal route auth checks
- domain service behavior
- ingress-vs-local branch selection

## Operational Verification

After deployment of each domain batch:

1. open EU admin page
2. confirm data matches RU live state
3. perform a mutation through EU
4. confirm the change is visible on a fresh EU reload
5. confirm the live runtime path observes the same change where applicable

The rollout should stop on the first domain that fails one of these checks.

## Risks

### Missed entrypoint

One unbridged page, helper, or delete action can keep split-brain alive.

Mitigation:

- start from a full inventory
- track read and write entrypoints together per domain

### Serialization drift

EU page expectations may not match RU internal payloads.

Mitigation:

- centralize per-domain shaping in service and client modules
- test dates, nullable fields, and enum-like strings explicitly

### Accidental local fallback

A migrated domain could still read EU-local data during bridge failure.

Mitigation:

- never fallback to local Prisma in ingress mode for migrated domains

### Upload path mismatch

A file-backed admin action may save metadata to RU but assets somewhere inconsistent, or vice versa.

Mitigation:

- migrate file-bearing mutation paths as first-class parts of each domain

## Acceptance Criteria

- All included admin domains read from RU when running as EU ingress.
- All included admin mutations write to RU when running as EU ingress.
- No migrated domain silently falls back to EU-local Prisma in ingress mode.
- EU admin and live runtime show the same records for onboarding, menu, styles, prompts, triggers, groups, tariffs, and related admin-controlled data.
- Existing old EU-local data may remain present, but it is no longer authoritative.

## Follow-Up After Stage 1

Once the single-source cutover is stable:

- identify and remove dead EU-local admin data paths
- decide whether to keep the bridge pattern long-term or extract a cleaner dedicated admin backend
- perform legacy environment and infrastructure cleanup only after the admin path is operationally stable
