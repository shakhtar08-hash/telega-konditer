# Manual User Groups Design

## Summary

Add manual user groups as a first-class admin feature and expose them inside trigger conditions as a structured audience rule.

This feature uses a hybrid audience model:

- manual user groups are managed explicitly by admins
- system segments such as active tariff, promo received, and generation count remain separate trigger conditions

The first release should introduce:

- a dedicated `/admin/user-groups` section
- a user detail page at `/admin/users/[userId]`
- membership management from both the group page and the user page
- a trigger condition `User is in group`

This replaces the raw string-style `groupId` editing experience in triggers with a real group selection flow.

## Goals

- Make manual user groups manageable as a real admin concept.
- Keep trigger audience logic business-friendly and structured.
- Preserve the current hybrid model where system-derived conditions stay separate from manual groups.
- Let admins manage memberships from both the group side and the user side.
- Keep the first version intentionally small and predictable.
- Keep the `admin/triggers` interface fully in Russian.
- Make deleting existing triggers an explicit supported admin action.

## Non-Goals

- No dynamic or rule-based groups in the first version.
- No auto-sync from system segments into manual groups.
- No bulk import or массовое назначение пользователей пачками.
- No negative group condition such as `User is not in group`.
- No multi-group operators such as any-of, all-of, or none-of.
- No redesign of onboarding around groups.

## Product Model

### User Group

A user group is a saved manual audience bucket created by an admin.

Each group should have:

- `name`
- optional short internal description
- created timestamp
- updated timestamp

The group is a reusable audience building block for triggers and admin operations.

### Membership

Membership is an explicit many-to-many relation between users and groups.

Admins add or remove users manually.

The system does not infer membership from tariff state, promo state, or usage history.

## Routes and Information Architecture

### `/admin/user-groups`

This becomes the main entry point for manual groups.

The page should include:

- group list
- create group action
- simple group stats such as member count
- open action for each group

The visual style should stay aligned with the existing dark admin language already used in `Triggers`.

### `/admin/user-groups/[groupId]`

This page is the group management workspace.

It should include:

- group header with name and edit actions
- current members list
- search field for finding users to add
- add user action
- remove member action

The group page is one of two membership management entry points.

### `/admin/users/[userId]`

Add a dedicated user detail page instead of overloading the current user table.

This page should include:

- user identity block
- current tariff state
- current token or expiry details already managed in admin
- `User groups` block with current memberships
- add or remove group actions

The user page is the second membership management entry point.

### `/admin/users`

Keep the existing table-focused list as the browsing layer.

Do not turn it into a dense inline group editor.

Instead, add a clear action such as `Open` or `Details` that leads to `/admin/users/[userId]`.

## Trigger Integration

### Hybrid Conditions Model

Triggers keep their current structured conditions model, but manual groups become a real condition type rather than a freeform string.

System conditions remain separate, for example:

- `Active tariff is Yes/No`
- `Promo claimed is Yes/No`
- `Generation count equals / is at least N`

Manual group becomes:

- `User is in group`

This keeps the distinction clear:

- system conditions are computed from live product state
- manual groups are curated by admins

### Condition Shape

The first release should replace the raw `groupId` string-style editing with a structured condition that points to a real saved group.

Recommended application-level shape:

```ts
type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "userGroupId"; operator: "isMember"; value: string };
```

Notes:

- `value` stores the selected group id
- UI should resolve that id to the group name
- the first version needs only one operator for manual groups

### Trigger Form UX

In the trigger conditions builder:

- remove manual typing of raw `groupId`
- add a condition row type labeled `User group`
- operator is fixed to something business-friendly such as `is in`
- value is a select of existing groups

Helpful UX details:

- show member count beside each group when practical
- if no groups exist, show a calm CTA to create one
- keep this condition participating in the existing `AND` logic

### Trigger Admin Language

As part of this work, the `admin/triggers` interface should be normalized into Russian.

This includes:

- page titles
- field labels
- filter labels
- button text
- helper text
- condition summaries
- empty states

New group-related labels must follow the same Russian language direction.

### Trigger Evaluation

At event time, user state loading should include manual group memberships.

The evaluation rule is simple:

- the condition passes when the user belongs to the selected group id

No negation and no multi-group logic in the first version.

## Data Model Direction

Recommended Prisma direction:

```prisma
model UserGroup {
  id          String            @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  memberships UserGroupMember[]
}

model UserGroupMember {
  userId      String
  userGroupId String
  createdAt   DateTime @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userGroup   UserGroup @relation(fields: [userGroupId], references: [id], onDelete: Cascade)

  @@id([userId, userGroupId])
  @@index([userGroupId])
}
```

Recommended relation additions:

- `User.groupMemberships UserGroupMember[]`

This structure is explicit, simple to query, and safe for first-version manual management.

## Data Flow

### Group Creation

1. Admin opens `/admin/user-groups`
2. Admin creates a named group
3. Group appears in trigger condition selects and membership editors

### Membership Management From Group Page

1. Admin opens `/admin/user-groups/[groupId]`
2. Searches users
3. Adds or removes users
4. Membership updates immediately affect future trigger evaluations

### Membership Management From User Page

1. Admin opens `/admin/users/[userId]`
2. Sees current groups
3. Adds or removes memberships
4. Changes are reflected on group pages and in triggers

### Trigger Runtime

1. Product event occurs
2. Trigger runtime loads `TriggerUserState`
3. `TriggerUserState` includes `groupIds`
4. Conditions evaluate with existing `AND` behavior
5. Matching triggers schedule or send as usual

### Trigger Deletion

Deleting an existing trigger must be a visible and supported admin flow.

Minimum first-version support:

- delete action on the trigger edit page
- optional delete action in the trigger list if it fits the current layout cleanly

Behavior expectations:

- trigger no longer participates in future evaluations
- unsent queued rows for that trigger are handled consistently with the current trigger policy
- the UI uses a clear Russian confirmation or warning pattern

## Validation Rules

- group must have a non-empty name
- group name should be unique enough for admin clarity
- duplicate membership for the same user and same group must be impossible
- removing a group should also remove its memberships
- deleting a user should also remove memberships
- trigger condition referencing a deleted group must be handled safely

Safer first-version behavior for deleted groups:

- trigger edit screen should surface that the referenced group no longer exists
- application code should treat that condition as invalid until the trigger is fixed

## UI Behavior Notes

### Group List

The list should emphasize:

- group name
- members count
- updated date
- open action

This is an admin management surface, not a marketing audience designer.

### Group Detail Page

The page should prioritize speed:

- current members visible immediately
- user search close to the members list
- single-click add or remove

### User Detail Page

The user page should be the place where an admin answers:

- who is this user
- what tariff do they have
- what groups are they in

This keeps `/admin/users` fast and readable.

## First-Release Constraints

- Only manual groups.
- Only one structured group operator: `is in`.
- No support for `is not in`.
- No support for selecting several groups in one condition.
- No support for bulk assignment.
- No support for rule-based auto-membership.
- No support for converting system segments into saved groups.

These limits are deliberate to keep the feature coherent and easy to trust.

## Testing Strategy

### Data and Service Tests

Add coverage for:

- creating and deleting groups
- adding and removing memberships
- preventing duplicate memberships
- loading user state with group ids
- trigger condition evaluation for `userGroupId`

### Admin UI Tests

Add coverage for:

- group list rendering
- group detail membership actions
- user detail group editing
- trigger form rendering group condition as select
- empty-state behavior when no groups exist
- Russian trigger UI labels for the touched group condition and related screens
- deleting an existing trigger from the supported admin flow

### Regression Tests

Preserve coverage for:

- existing trigger system conditions
- existing `AND` condition behavior
- user tariff editing and current admin user flows

## Risks

- A new user detail route introduces navigation work in a section that is currently table-first.
- Trigger conditions already have some legacy compatibility concerns, so condition normalization must stay strict.
- Deleted groups can leave stale references in trigger rules unless edit-time validation is handled cleanly.
- Membership UX can sprawl quickly if bulk actions or multi-group logic are added too early.

## Success Criteria

- Admin can create a manual group from `/admin/user-groups`.
- Admin can manage memberships from both the group page and the user page.
- Trigger form offers `User group` as a structured condition without raw id entry.
- Existing system-derived trigger conditions remain separate and unchanged in purpose.
- Trigger runtime evaluates manual group membership correctly.
- First version remains intentionally simple and understandable.
- `admin/triggers` uses Russian-facing UI copy for the touched screens.
- Admin can delete an existing trigger through the supported UI flow.

## Resolved Decisions

- Hybrid model: yes
- Separate group section: yes, `/admin/user-groups`
- Membership management entry points: both group page and user page
- User editing surface: dedicated `/admin/users/[userId]`
- Trigger group condition shape: one simple positive membership rule
- System segments stay separate from manual groups: yes
