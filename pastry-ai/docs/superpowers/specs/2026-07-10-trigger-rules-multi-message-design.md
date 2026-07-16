# Trigger Rules Multi-Message Design

## Summary

Redesign trigger messages so one trigger rule (`slug`) can own multiple scheduled messages with different send times.

The current model treats `slug` as unique and effectively supports:

- one event
- one trigger message

The new model must support:

- one event/rule (`slug`)
- many trigger messages inside that rule
- unique `delayMinutes` only within the same `slug`

This redesign also changes scheduled-message tracking so pending sends are tied to a specific trigger message, not only to the shared rule slug.

## Goals

- Allow multiple trigger messages under one stable rule `slug`.
- Keep `slug` immutable after creation.
- Enforce uniqueness on `slug + delayMinutes`.
- Allow different `targetPlans` for messages within the same `slug`.
- Update unsent scheduled messages when a trigger message is edited.
- Delete unsent scheduled messages when a trigger message is deleted.
- Group the admin UI by `slug`.

## Non-Goals

- No support for editing `slug` after creation.
- No support for equal `delayMinutes` within the same `slug`.
- No changes to already sent scheduled messages.
- No trigger versioning system.
- No rollout outside the existing trigger feature scope.

## Product Rules

### Trigger Rule

- `slug` is the stable identifier of an event/rule.
- Example: `after-start`, `after-payment`.
- It is created once and never edited.

### Trigger Messages Inside a Rule

- A rule can contain multiple messages.
- Each message has its own:
  - `title`
  - `text`
  - `imageUrl`
  - `delayMinutes`
  - `targetPlans`
  - `active`
- `delayMinutes` must be unique within one `slug`.
- `targetPlans` may differ between messages of the same `slug`.

### Scheduled Messages

- Pending scheduled sends must be tied to the specific trigger message that generated them.
- Editing a trigger message updates its unsent scheduled messages.
- Deleting a trigger message deletes its unsent scheduled messages.
- Sent scheduled messages remain untouched.

## Current State

Today the system assumes one active trigger per slug:

- `TriggerMessage.slug` is unique.
- The trigger service loads one message by slug.
- `ScheduledMessage` stores `triggerSlug`, not a specific trigger message id.
- Duplicate scheduling is prevented by `triggerSlug + chatId + sentAt IS NULL` semantics.

This structure blocks multi-message rules and makes selective update/delete of pending scheduled sends unsafe.

## Proposed Data Model

### TriggerMessage

Change from:

- unique `slug`

To:

- non-unique `slug`
- composite uniqueness on `slug + delayMinutes`

Shape:

```prisma
model TriggerMessage {
  id           String   @id @default(cuid())
  slug         String
  title        String
  text         String
  imageUrl     String?
  delayMinutes Int
  targetPlans  Json
  buttons      Json?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([slug, delayMinutes])
  @@index([slug, active])
}
```

### ScheduledMessage

Add direct linkage to the originating trigger message:

```prisma
model ScheduledMessage {
  id               String    @id @default(cuid())
  triggerMessageId String
  triggerSlug      String
  chatId           String
  text             String
  imageUrl         String?
  buttons          Json?
  triggeredAt      DateTime
  sendAt           DateTime
  sentAt           DateTime?
  createdAt        DateTime  @default(now())
}
```

Notes:

- `triggerSlug` may remain for reporting/debugging convenience.
- `triggerMessageId` becomes the authoritative link for update/delete behavior.
- Duplicate pending messages should be prevented per `triggerMessageId + chatId`, not only per `triggerSlug + chatId`.
- `triggeredAt` stores the original event time that produced the scheduled row.

Recommended indexes:

- `@@index([triggerSlug])`
- `@@index([triggerMessageId, chatId, sentAt])`
- `@@index([sentAt, sendAt])`

## Scheduling Logic Redesign

### Before

`scheduleTrigger(slug, chatId, plan)`:

1. Load one active trigger by slug.
2. Check plan membership.
3. Check whether one pending scheduled row already exists for that slug+chatId.
4. Create one scheduled message.

### After

`scheduleTrigger(slug, chatId, plan)`:

1. Load all active trigger messages by slug.
2. Filter messages whose `targetPlans` contain the user plan.
3. For each matching trigger message:
   - check whether an unsent scheduled row already exists for `triggerMessageId + chatId`
   - if not, create one scheduled row
4. Return after processing the whole set.

This produces one pending scheduled row per eligible trigger message.

Each created scheduled row must snapshot:

- `triggeredAt = now`
- `sendAt = triggeredAt + delayMinutes`

## Edit Behavior

When a trigger message is edited:

1. Update the trigger message itself.
2. Find all unsent `ScheduledMessage` rows with that `triggerMessageId`.
3. Update those unsent rows with the new snapshot fields:
   - `text`
   - `imageUrl`
   - `buttons` if used
   - `sendAt`, recalculated from `triggeredAt + delayMinutes`

### Decision on `sendAt`

Editing a trigger message should update unsent content and should also recalculate `sendAt` when `delayMinutes` changes.

Therefore:

- unsent rows must update message content fields
- unsent rows must recompute `sendAt` from the original event time
- the recomputation formula is `sendAt = triggeredAt + delayMinutes`

This stays product-correct because the recalculation uses the original event timestamp rather than `now`.

## Delete Behavior

When a trigger message is deleted:

1. Delete unsent `ScheduledMessage` rows for that `triggerMessageId`.
2. Delete the trigger message itself.
3. Sent rows remain untouched.

## Admin UX

### Grouping

`/admin/triggers` becomes grouped by `slug`.

Each group represents one trigger rule/event and contains:

- rule header with immutable `slug`
- list of trigger messages sorted by `delayMinutes`
- create-new-message form within the rule

### Creating Rules

There should be a top-level flow to create a new rule by `slug`.

After the rule exists, admins add one or more messages under it.

### Editing Rules

- `slug` is displayed but not editable.
- Message-level fields remain editable:
  - title
  - text
  - image
  - delayMinutes
  - targetPlans
  - active

### Validation

If the admin tries to create or edit a message so that another message in the same `slug` already has the same `delayMinutes`, show a friendly validation error instead of a raw database error.

## Image Support

This redesign assumes trigger messages keep optional image support as part of the newer admin-image-upload direction:

- `imageUrl` remains per trigger message
- scheduled rows snapshot `imageUrl` so queued sends remain stable

## Service Interface Changes

### Trigger Repository / Service

Replace single-record access with list-based access.

Current style:

```ts
findActiveBySlug(slug: string): Promise<TriggerMessageRecord | null>
```

New style:

```ts
findActiveBySlug(slug: string): Promise<TriggerMessageRecord[]>
findPendingScheduledForTrigger(
  triggerMessageId: string,
  chatId: string,
): Promise<{ id: string } | null>
```

### TriggerMessageRecord

Must include:

- `id`
- `slug`
- `title`
- `text`
- `imageUrl`
- `delayMinutes`
- `targetPlans`
- `active`

### ScheduledMessageRecord

Must include:

- `id`
- `triggerMessageId`
- `triggerSlug`
- `chatId`
- `text`
- `imageUrl`
- `triggeredAt`
- `sendAt`
- `sentAt`

## Migration Strategy

### TriggerMessage

1. Drop the unique constraint on `slug`.
2. Add nullable `imageUrl` only if not already added separately by the image-upload work.
3. Add unique composite index on `slug + delayMinutes`.

### ScheduledMessage

1. Add `triggerMessageId`.
2. Add `triggeredAt`.
3. Add `imageUrl` only if message snapshots need it and the column does not exist yet.
4. Backfill `triggerMessageId` for existing scheduled rows by joining on `triggerSlug`.
5. Backfill `triggeredAt` for existing scheduled rows.

### Backfill Assumption

Because the old schema allowed only one trigger per `slug`, backfilling existing rows from `triggerSlug` to `triggerMessageId` is deterministic for historical data.

For historical rows, `triggeredAt` should be reconstructed as:

- `triggeredAt = sendAt - interval(delayMinutes minutes)`

using the matched trigger message's `delayMinutes`.

## Testing Strategy

### Unit Tests

Add or update tests for:

- scheduling multiple messages for one slug
- skipping duplicate pending rows per `triggerMessageId + chatId`
- filtering each message independently by `targetPlans`
- updating unsent scheduled rows when a trigger message changes
- recalculating unsent `sendAt` from `triggeredAt` when `delayMinutes` changes
- deleting unsent scheduled rows when a trigger message is deleted
- preventing duplicate `delayMinutes` within the same `slug`

### Admin Tests

Add tests for:

- grouped rendering by `slug`
- immutable `slug` in edit mode
- friendly validation on duplicate `delayMinutes`
- create-message-under-rule flow

## Risks

- This is a behavior-level redesign, not just a schema tweak.
- Existing admin UI assumptions are flat; grouping will require meaningful layout changes.
- Scheduled-message updates on edit must be carefully limited to unsent rows only.
- Historical backfill of `triggeredAt` depends on old `sendAt` values and the matched trigger's `delayMinutes`.

## Success Criteria

- One `slug` can own multiple trigger messages.
- Duplicate `delayMinutes` inside the same `slug` are blocked.
- Scheduling one event can create multiple pending sends for the same user.
- Editing one trigger message updates its unsent scheduled rows only.
- Editing `delayMinutes` recalculates unsent `sendAt` from `triggeredAt`.
- Deleting one trigger message removes its unsent scheduled rows only.
- `/admin/triggers` presents grouped rules by `slug`.

## Open Decisions Resolved

- Multiple messages per slug: yes
- Delay uniqueness inside slug: yes
- Different target plans inside slug: yes
- Edit updates unsent scheduled rows: yes
- Delete removes unsent scheduled rows: yes
- Admin UI grouped by slug: yes
- Slug editable after creation: no
