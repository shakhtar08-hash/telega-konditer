# Dynamic User Groups Design

## Summary

Add virtual dynamic user groups as a reusable segmentation layer for admin workflows and triggers.

Dynamic groups are saved rule definitions, not stored memberships. Their user sets are computed from live user state when needed.

The first release should support:

- a dedicated `/admin/dynamic-user-groups` admin section
- a condition builder with `AND` / `OR`
- positive and negative conditions
- previewing the segment size and a sample user list
- using dynamic groups as trigger conditions
- filtering admin users by dynamic group

This feature must stay separate from manual user groups:

- manual groups are curated memberships
- dynamic groups are computed rules

## Goals

- Make reusable computed segments a first-class admin concept.
- Let admins create rich virtual audiences without writing code.
- Reuse dynamic groups across triggers and user admin views.
- Keep evaluation based on live user state rather than persisted snapshots.
- Support both positive and negative conditions in the first release.
- Keep the first release operationally simple and easy to debug.

## Non-Goals

- No materialized membership table for dynamic groups.
- No background sync or cron-based recomputation.
- No exporting a dynamic group into a manual group.
- No dynamic-group-to-dynamic-group references.
- No nested logical trees or grouped parentheses in the first release.
- No bulk actions over dynamic-group result sets in the first release.
- No historical audit of segment membership changes.

## Product Model

### Dynamic Group

A dynamic group is a saved rule definition that describes a virtual segment.

Each dynamic group should have:

- `name`
- optional internal description
- `status`
- top-level logic operator: `AND` or `OR`
- ordered list of conditions
- created timestamp
- updated timestamp

### Dynamic Group Membership

Dynamic groups do not store memberships.

Membership is computed from live user state and related persisted data such as:

- tariff state
- promo state
- generation counts
- last activity
- signup date

## Data Model Direction

Recommended Prisma direction:

```prisma
model DynamicUserGroup {
  id            String   @id @default(cuid())
  name          String
  description   String?
  status        String   @default("active")
  logicOperator String
  conditionsJson Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([name])
  @@index([status, updatedAt])
}
```

Recommended application-level definition:

```ts
type DynamicGroupCondition =
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte" | "lte"; value: number }
  | { field: "daysSinceLastActivity"; operator: "gte" | "lte"; value: number }
  | { field: "daysSinceSignup"; operator: "gte" | "lte"; value: number }
  | { field: "remainingTokens"; operator: "equals" | "gte" | "lte"; value: number }
  | { field: "tariffExpired"; operator: "is"; value: boolean };

type DynamicUserGroupDefinition = {
  logicOperator: "AND" | "OR";
  conditions: DynamicGroupCondition[];
};
```

Notes:

- dynamic groups may not reference manual groups
- dynamic groups may not reference dynamic groups
- conditions are stored in normalized JSON, not freeform expressions

## Evaluation Model

### Live Evaluation

Dynamic group membership is computed on demand.

This applies in three places:

- previewing a segment in admin
- filtering user lists by dynamic group
- checking trigger conditions that reference a dynamic group

### Evaluator Responsibilities

Create a shared evaluator service that can:

- evaluate whether a single user matches a dynamic group
- compute a preview count
- fetch a paginated preview list of matching users
- explain the top-level match result for admin-facing previews when needed later

Recommended API direction:

```ts
type DynamicGroupEvaluationContext = {
  userId: string;
  state: TriggerUserState;
  createdAt: Date;
  lastActivityAt: Date | null;
  remainingTokens: number | null;
};

type DynamicGroupEvaluator = {
  matches(
    definition: DynamicUserGroupDefinition,
    context: DynamicGroupEvaluationContext,
  ): boolean;
};
```

### Query Strategy

For the first release:

- use live evaluation with query-assisted filtering where practical
- allow preview counts and preview lists to be computed from live queries
- do not add a background materialization layer

This keeps data fresh and avoids sync drift.

## Condition Builder

### Shape

The first release should use a flat builder:

- one ordered list of condition rows
- one top-level logic switch: `AND` / `OR`
- no nested groups
- no parentheses UI

### Supported Condition Types

The first release should support:

- `Has active tariff`
- `Promo claimed`
- `Generation count`
- `Days since last activity`
- `Days since signup`
- `Remaining tokens`
- `Tariff expired`

### Supported Operators

The first release should support:

- `is`
- `is not`
- `equals`
- `greater than`
- `greater than or equal`
- `less than`
- `less than or equal`

### UX Direction

Each row should render:

- field
- operator
- value input
- remove action

Examples:

- `Активный тариф` `равно` `Да`
- `Количество генераций` `не меньше` `3`
- `Дней с последней активности` `не меньше` `7`
- `Состоит в ручной группе` `да` `VIP`

### Validation Rules

- group must have a non-empty name
- dynamic group name should be unique enough for admin clarity
- at least one condition is required
- all conditions must be fully specified
- manual-group references are not allowed in dynamic-group conditions
- dynamic-group references are not allowed at all

## Routes and Information Architecture

### `/admin/dynamic-user-groups`

This becomes the main listing page for virtual segments.

The page should include:

- list of dynamic groups
- create action
- status
- top-level logic label
- number of conditions
- preview size
- open action

### `/admin/dynamic-user-groups/[groupId]`

This becomes the dynamic-group workspace.

The page should include:

- header with name and description
- status toggle
- condition builder
- `AND` / `OR` switch
- preview count
- paginated preview list of matching users
- section showing where the group is used by triggers

### `/admin/users`

Keep the current user list as the browsing surface.

Add dynamic-group-based filtering, such as:

- all users
- users matching dynamic group X

This page should not try to inline-edit dynamic-group rules.

### `/admin/triggers`

Add dynamic groups as a reusable trigger condition source.

The trigger builder should offer:

- `Пользователь в ручной группе`
- `Пользователь в динамической группе`

These must remain distinct condition types.

## Trigger Integration

Recommended trigger condition extension:

```ts
type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "userGroupId"; operator: "isMember"; value: string }
  | { field: "dynamicUserGroupId"; operator: "matches"; value: string };
```

Runtime behavior:

1. Product event occurs
2. Trigger system loads the current user state
3. If a trigger condition references a dynamic group, the evaluator loads that dynamic group
4. The evaluator checks whether the user matches the dynamic-group definition
5. The result is combined with the trigger's normal `AND` condition logic

Dynamic groups should not be collapsed into `groupIds`.

They remain evaluated by a dedicated service.

## Admin Copy Direction

Touched screens should stay consistent with the existing Russian admin style.

Examples:

- `Динамические группы`
- `Совпадают все условия`
- `Совпадает хотя бы одно условие`
- `Превью сегмента`
- `Пользователь входит в динамическую группу`
- `Не входит в ручную группу`

## First-Release Constraints

- only flat condition lists
- only one top-level logical operator
- no nested condition groups
- no dynamic-group-to-dynamic-group references
- no stored memberships
- no snapshot/export into manual groups
- no bulk operations on matching users
- no historical segment diffing
- no automatic trigger-side caching layer

These constraints are deliberate to keep the feature trustworthy and debuggable.

## Risks

- live counting and previewing can become expensive if user volume grows
- negative conditions require careful evaluator semantics
- last-activity-based rules need a well-defined source of truth
- manual and dynamic groups must stay visually distinct in trigger UI
- later adding nested logic will require a tree model, so first-release schemas should avoid dead ends

## Testing Strategy

### Evaluator Tests

Add coverage for:

- top-level `AND`
- top-level `OR`
- positive boolean conditions
- negative boolean conditions
- numeric comparison conditions
- rejecting unsupported condition payloads

### Admin UI Tests

Add coverage for:

- dynamic-group list rendering
- condition builder rendering
- preview count display
- preview user list
- trigger form support for dynamic-group selection
- user list filtering by dynamic group

### Trigger Integration Tests

Add coverage for:

- trigger conditions matching dynamic groups
- dynamic groups coexisting with manual groups
- existing trigger conditions staying unchanged

## Success Criteria

- admin can create and edit a dynamic group from `/admin/dynamic-user-groups`
- admin can define a flat rule set using `AND` or `OR`
- dynamic groups support both positive and negative conditions
- admin can preview segment size and matching users without stored memberships
- `/admin/users` can filter by dynamic group
- trigger rules can reference a dynamic group as a reusable segment
- manual and dynamic groups remain clearly separated in admin language and behavior
- the first release avoids recursion, background sync, and nested rule trees

## Resolved Decisions

- dynamic groups are virtual only: yes
- condition builder instead of preset templates: yes
- support `AND` and `OR`: yes
- support negative conditions: yes
- allow references to manual groups: no
- allow references to dynamic groups: no
- membership computed live instead of materialized: yes
- reusable in triggers: yes
