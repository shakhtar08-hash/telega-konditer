# Trigger Test Send and HTML Formatting Design

## Summary

Add two authoring improvements to the admin trigger editor:

1. A test-send action under the trigger preview that sends the current draft message to the user group named `Админы`.
2. HTML-based Telegram formatting support in the trigger message textarea, with quick formatting controls for common tags.

The feature is aimed at validating real Telegram output before saving or activating a trigger, including text formatting, inline buttons, and optional media.

## Goals

- Let admins send the current trigger draft to the `Админы` group without saving the trigger first.
- Support Telegram-compatible rich text formatting in trigger messages.
- Keep the authoring flow inside the existing trigger edit/create screen.
- Reuse existing trigger button and image inputs so the test message reflects the current form state.

## Non-Goals

- No full WYSIWYG editor.
- No arbitrary HTML support beyond a small Telegram-safe subset.
- No broadcast testing to custom groups in this slice.
- No persistence of test-send history in this slice.

## User Experience

### Formatting Toolbar

The trigger message textarea will gain a compact toolbar above it with quick actions for:

- Bold: `<b>...</b>`
- Italic: `<i>...</i>`
- Strikethrough: `<s>...</s>`
- Inline code: `<code>...</code>`
- Code block: `<pre>...</pre>`
- Quote: `<blockquote>...</blockquote>`
- Link: `<a href="https://...">...</a>`

Toolbar behavior:

- If text is selected, the chosen tag wraps the selection.
- If no text is selected, the chosen tag inserts an empty pair and places the caret inside it.
- Link insertion uses a simple placeholder URL when no URL is already present.

### Test Send

Under the trigger preview card, add a button labeled `Отправить тестовое сообщение`.

Behavior:

- The action uses the current unsaved form state.
- The action sends the message to every Telegram user in the user group named `Админы`.
- The action does not save or mutate the trigger record.
- The action returns an inline status message in the admin UI, for example:
  - success with recipient count
  - group not found
  - no Telegram recipients in group
  - Telegram send failure

## Telegram Formatting Model

The trigger message format will be treated as Telegram `parse_mode: "HTML"`.

Supported tags in this slice:

- `<b>`
- `<i>`
- `<s>`
- `<code>`
- `<pre>`
- `<blockquote>`
- `<a href="...">`

Constraints:

- The message must remain plain textarea content stored as a string.
- Only the supported subset is considered valid authoring input.
- Unsupported tags should be rejected before sending the test message and before saving trigger content if validation is added in the same code path.

## Data Flow

### Authoring

1. Admin edits trigger fields in the existing form.
2. Toolbar helpers manipulate the textarea value in-place on the client.
3. Preview updates from local component state, just as it does today.

### Test Send

1. Admin clicks `Отправить тестовое сообщение`.
2. A dedicated server action receives the current form state as `FormData`.
3. The action builds the same payload shape that a real trigger would send:
   - message text
   - optional image
   - inline buttons
4. The action loads the user group named `Админы`.
5. The action resolves group members that have Telegram identities.
6. The action sends:
   - `sendPhoto` with `caption`, `parse_mode: "HTML"`, and `reply_markup` when an image is present
   - `sendMessage` with `parse_mode: "HTML"` and `reply_markup` when there is no image
7. The action returns a UI-safe result object for display in the form.

## Server-Side Responsibilities

Add a new server action in the trigger admin actions module for test sending.

Responsibilities:

- Parse current trigger form data without creating or updating a trigger record.
- Reuse existing image handling semantics where possible.
- Validate formatting against the allowed Telegram HTML subset.
- Load the `Админы` group by exact name.
- Load group members and map them to Telegram user IDs.
- Send the test message to each recipient.
- Aggregate success/failure into a user-facing status.

## UI Structure

The trigger editor page remains a two-column layout.

Changes:

- Keep the main form in the left column.
- Add a formatting toolbar above the trigger message textarea.
- Keep preview in the right column.
- Add the test-send button and result status under the preview block so the control is visually tied to the rendered output.

## Error Handling

The feature must fail safely and visibly.

Expected cases:

- `Админы` group does not exist:
  - show a clear inline error
  - do not throw an unhandled page error
- Group exists but has no members:
  - show a clear inline error
- Members exist but none have Telegram IDs:
  - show a clear inline error
- Telegram API failure for one or more recipients:
  - return partial success information where possible
- Invalid HTML subset usage:
  - show validation error before attempting send

## Validation Rules

For this slice, validation is intentionally narrow:

- Message text remains required.
- Allowed tags are limited to the approved Telegram HTML subset.
- Link tags must include an `href`.
- Malformed or mismatched supported tags should block test send with a readable error.

This validation should be scoped to the authoring/test-send path, not implemented as a generic HTML sanitizer.

## Testing Strategy

### Client Tests

- Toolbar wraps selected text with the chosen tag.
- Toolbar inserts empty tag pairs at the caret when nothing is selected.
- Link insertion creates the expected placeholder structure.
- The test-send control renders under preview.

### Server Action Tests

- Sends plain message to `Админы`.
- Sends image + caption when image is present.
- Includes inline buttons in the Telegram payload.
- Returns error when `Админы` group is missing.
- Returns error when no Telegram recipients are available.
- Returns validation error for unsupported or malformed formatting.

### Integration Confidence

- Confirm the result uses real trigger-form button data and current unsaved textarea content.
- Confirm no trigger record is saved or modified by the test-send action.

## Implementation Notes

- Prefer reusing existing trigger button parsing helpers rather than duplicating button payload logic.
- Keep formatting helpers local to the trigger admin UI unless another authoring screen clearly needs them.
- Avoid introducing a third-party rich text editor for this slice.
- Preserve the current trigger preview as a lightweight approximation; the Telegram test-send is the source of truth for final rendering.

## Acceptance Criteria

- Admin can format trigger message text using HTML quick actions.
- Admin can send the current draft trigger message to the `Админы` group without saving.
- Test send includes current text, current inline buttons, and current optional image.
- Test send uses Telegram HTML parse mode.
- The UI shows success or failure inline after attempting a test send.
- No trigger persistence occurs during test send.
