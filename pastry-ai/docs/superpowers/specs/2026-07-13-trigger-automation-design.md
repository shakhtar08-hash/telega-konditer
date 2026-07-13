# Trigger Automation Design

## Summary

Redesign the admin `Triggers` section into a focused automation builder for event-based Telegram messages.

This feature is separate from:

- `Onboarding`, which remains an independent start-flow with its own staged messages and buttons
- future manual or scheduled bulk campaigns

The new `Triggers` section should let admins define automated sends using:

- one source event
- multiple conditions
- one delivery delay
- one Telegram message payload

The interface should visually follow the supplied dark two-panel references:

- a compact left panel for reusable trigger templates and event shortcuts
- a larger right panel for trigger list management
- a dedicated create/edit screen with Telegram preview on the right

## Goals

- Replace the current slug-centric trigger admin with a clearer business-facing automation UI.
- Support one trigger event plus multiple conditions in a single trigger.
- Support delayed or immediate automated sends.
- Keep onboarding outside this system.
- Add ready-made templates based on common product scenarios.
- Preserve the visual direction of the provided references while adapting the fields to trigger logic.

## Non-Goals

- No migration of onboarding into triggers.
- No support for manual broadcast campaigns in this feature.
- No support for OR logic in the first version.
- No visual branching flow builder.
- No arbitrary scheduled date/time sends in triggers.
- No trigger actions beyond sending a Telegram message in the first version.

## Product Model

### Trigger

A trigger is one automation rule.

Each trigger contains:

- `name`
- `event`
- `conditions`
- `delay`
- `message`
- `status`

### Event

An event is the moment that starts trigger evaluation.

First-version events should cover realistic existing product needs, for example:

- user pressed `Start`
- promo tariff granted
- promo tariff expired
- paid tariff activated
- user became inactive for a defined period

Each trigger has exactly one event.

### Conditions

Conditions narrow the audience after the event has happened.

Examples:

- user has no active tariff
- user has not received promo tariff
- user has made zero generations
- user belongs to a saved user group
- user completed at least N generations

First version logic:

- all conditions are combined with `AND`
- admins may add multiple condition rows
- no `OR` groups yet

### Delay

Delay defines when the message is sent after the event time.

Supported options:

- immediately
- after N minutes
- after N hours
- after N days

Delay is tied to the event timestamp, not the edit time.

### Message

Each trigger sends one Telegram message payload with:

- internal admin title
- message text
- optional image/banner
- optional buttons

The create/edit screen includes live Telegram-style preview.

### Status

First-version statuses:

- `draft`
- `active`
- `disabled`

## UX Structure

### Navigation

Inside the chatbot area, `Triggers` becomes the home for automated event-based sends.

`Onboarding` remains a separate neighbor section and keeps its current dedicated logic.

### Trigger List Screen

The trigger list screen follows the first provided reference closely in composition.

#### Left Panel

The left panel is a compact support area instead of a record list.

It contains:

- `Ready templates`
- `System events`
- optionally later `User groups`

The panel should feel like a launch surface for quick setup, not a dense configuration area.

#### Right Panel

The main panel contains:

- search by trigger name
- filter by event
- filter by status
- sorting
- primary action button `Create trigger`

The table or list shows:

- trigger name
- event
- delay
- compact condition summary
- status
- actions

Actions:

- open
- duplicate
- enable or disable
- delete

### Create/Edit Trigger Screen

The create/edit screen follows the second provided reference in layout.

#### Main Form Area

Fields:

- `Trigger name`
- `Event`
- `Conditions`
- `Send`
- `Message text`
- `Banner`
- `Buttons`

#### Preview Area

The right-side panel shows:

- Telegram mobile preview
- short hint text explaining when the trigger will send

This area should remain visually close to the supplied mockup so the user can trust what the message will look like.

## Form Behavior

### Event Field

Event is a select or structured picker.

The field should list product-language events rather than technical slugs.

Good examples:

- `Pressed Start`
- `Promo tariff expired`
- `Paid tariff activated`

Avoid showing raw implementation IDs as the primary label.

### Conditions Builder

The condition block supports multiple rows.

Each row is:

- field
- operator
- value

Examples:

- `Active tariff` `is` `No`
- `Promo tariff received` `is` `No`
- `Generations count` `equals` `0`
- `User group` `contains` `Active promo users`

All rows are joined with `AND`.

UI expectations:

- add condition button
- remove condition button
- empty-state helper text

### Send Field

This block replaces the old "send after X minutes after joining" pattern from the reference with a trigger-aware delay picker.

Options:

- `Now`
- `In N minutes`
- `In N hours`
- `In N days`

The chosen value should be rendered back into human-readable summaries in the trigger list.

### Message Block

This block is intentionally close to the provided creation mockup.

Include:

- textarea for message text
- image picker or upload area
- up to two buttons
- button action types consistent with current admin capabilities

## Templates

Templates should be available from the first version as left-panel quick starts.

Selecting a template should prefill:

- trigger name
- event
- conditions
- delay
- draft message text

Admins can then edit before saving.

### Initial Template Set

1. `After Start: no promo`
   - Event: pressed Start
   - Conditions: no promo tariff, no active tariff
   - Delay: 15 minutes

2. `After Start: did not begin using`
   - Event: pressed Start
   - Conditions: zero generations, no active tariff
   - Delay: 1 day

3. `Promo granted but unused`
   - Event: promo tariff granted
   - Conditions: zero generations
   - Delay: 30 minutes

4. `Promo expired`
   - Event: promo tariff expired
   - Conditions: no active tariff
   - Delay: 5 minutes

5. `Promo expired after active usage`
   - Event: promo tariff expired
   - Conditions: generation count is at least 3, no active tariff
   - Delay: 2 hours

6. `Paid but not activated`
   - Event: paid tariff activated
   - Conditions: key feature usage is zero
   - Delay: 1 day

7. `Inactive for 7 days`
   - Event: inactivity threshold reached
   - Conditions: active tariff exists
   - Delay: now

## Data Model Direction

The existing data model is built around `slug`, `delayMinutes`, and one specific scheduled-message path. That is too narrow for the new trigger builder.

The new model should move toward explicit trigger rules.

### Trigger Rule

Recommended shape:

```prisma
model TriggerRule {
  id          String   @id @default(cuid())
  name        String
  eventKey    String
  status      String
  delayValue  Int
  delayUnit   String
  messageText String
  imageUrl    String?
  buttons     Json?
  conditions  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Notes:

- `eventKey` is the internal event identifier.
- `conditions` can be stored as structured JSON in version one.
- `delayUnit` allows minutes, hours, days, and immediate sends.
- status should map to a limited enum-like set in application code.

### Scheduled Trigger Send

If scheduling remains materialized in the database, pending sends should continue to snapshot message data at schedule time.

Recommended additions or retained expectations:

- link each scheduled row to a specific trigger rule
- snapshot text, image, and buttons
- store original event time
- store computed send time

This keeps edits safe and preserves existing queue behavior principles.

## Processing Rules

### Evaluation

When an event occurs:

1. load active trigger rules for that event
2. evaluate each rule's conditions against the user state
3. for matching rules, compute scheduled send time from event time plus delay
4. create pending send rows with message snapshot

### Duplicate Handling

The system should prevent accidental duplicate pending sends for the same trigger rule, same user, and same event occurrence.

Exact deduplication implementation can be finalized in planning, but the behavior goal is clear:

- one trigger should not enqueue the same message twice for the same user and same source event

### Editing

Editing a trigger rule should update the rule definition.

For unsent queued rows, we should keep the existing safe principle:

- update unsent content only when the product explicitly wants queued messages to change
- otherwise preserve already queued snapshots

This needs confirmation during implementation planning because the current system already has update behavior for unsent rows.

### Deleting

Deleting a trigger should:

- disable or remove future evaluations
- handle unsent queued rows consistently with current queue policy

Safer first-version recommendation:

- delete unsent queued rows for that trigger when the trigger is deleted

## Design Translation From References

The supplied references should be treated as the visual base, not copied verbatim.

### Reference 1 Adaptation

Keep:

- dark shell
- left support column
- right management panel
- top-right primary action
- search and filter row
- table-based overview

Adapt:

- left column content becomes templates and event shortcuts instead of user groups
- right table content becomes trigger rules instead of generic messages

### Reference 2 Adaptation

Keep:

- two-column create page
- form on left
- Telegram preview on right
- image and buttons block

Adapt:

- delay field becomes event-aware trigger send timing
- group selection becomes event plus conditions
- preview hint copy explains trigger timing

## Validation Rules

- trigger must have a name
- trigger must have one event
- trigger may have zero or more conditions
- trigger must have a valid delay configuration
- trigger must have message text
- buttons must satisfy existing button constraints
- invalid condition combinations should show friendly errors

## Testing Strategy

### Admin UI Tests

Add coverage for:

- trigger list renders templates section and trigger rows
- create screen renders event, condition, and delay fields
- template selection prefills trigger creation form
- status filters and event filters work

### Service Tests

Add coverage for:

- active rules loaded by event
- multiple conditions evaluated with `AND`
- immediate and delayed sends computed correctly
- deduplication of pending sends
- condition mismatch skips scheduling

### Regression Coverage

Preserve or adapt tests around:

- scheduled message processing
- image snapshot behavior
- existing trigger queue semantics where still applicable

## Risks

- The current trigger implementation is modeled around a simpler slug-based system, so this is a real redesign rather than a UI refresh.
- Event definitions may require new backend hooks for promo expiration, inactivity, and tariff lifecycle milestones.
- Condition definitions can sprawl quickly if not constrained to a deliberate first-version set.
- The visual references imply a polished UX; partial backend delivery without strong UI adaptation will feel inconsistent.

## Success Criteria

- Admin can create a trigger from an event, conditions, delay, and message.
- Admin can use a ready template to start faster.
- Trigger list is visually aligned with the provided references.
- Onboarding remains separate and unchanged.
- First version supports multiple conditions joined by `AND`.
- Trigger processing can schedule immediate or delayed Telegram messages based on business events.

## Open Decisions Resolved

- Onboarding stays separate: yes
- Multiple conditions per trigger: yes
- First-version condition logic: `AND`
- Templates in UI: yes
- Visual direction follows supplied references: yes
- Manual campaigns included here: no
