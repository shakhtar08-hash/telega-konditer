# Admin Image Upload Design

## Summary

Add a shared image upload flow for the admin panel so image fields can be filled either by:

- manually entering a URL/path, or
- selecting a local image file from the computer

The first implementation wave covers:

- `/admin/triggers`
- `/admin/chat-bot`
- `/admin/funnel`
- `/admin/photo-styles`

Local file storage is the chosen strategy for this task. Uploaded files will be written into the project under `public/uploads/admin/...` and stored in the database as web paths like `/uploads/admin/triggers/example.webp`.

## Goals

- Add image upload by click for admin image fields.
- Keep existing manual URL/path entry working everywhere.
- Add image support to `/admin/triggers`, where it does not exist today.
- Reuse one upload pattern across the covered admin pages instead of duplicating custom logic.
- Preserve compatibility with existing database rows and existing image URLs.

## Non-Goals

- No media library, search, tagging, or asset browser.
- No drag-and-drop requirement in this phase.
- No deletion of old files from disk in this phase.
- No rollout outside the admin panel.
- No migration to external object storage in this phase.

## Current State

- `/admin/triggers` stores only text metadata for trigger messages and has no image field.
- `/admin/chat-bot` has `previewImageUrl`, but the create form currently reads the value and does not persist it on create.
- `/admin/funnel` uses string-only `imagePath`.
- `/admin/photo-styles` uses string-only preview paths.
- Admin image inputs are inconsistent and depend on manual typing.

## Proposed Approach

Implement one shared admin image upload mechanism with three parts:

1. A server-side file saving helper that validates and writes image files into `public/uploads/admin/<entity>/`.
2. A reusable admin form component that combines:
   - the existing text input for URL/path,
   - a file picker,
   - optional preview of the current image.
3. Small updates in each server action so file input takes precedence when present, while the old string field remains as fallback.

## Storage Strategy

### Disk Location

Files are stored under:

- `public/uploads/admin/triggers/`
- `public/uploads/admin/chat-bot/`
- `public/uploads/admin/funnel/`
- `public/uploads/admin/photo-styles/`

### Stored Value

The database stores only the public path, for example:

- `/uploads/admin/triggers/20260710-182233-a1b2c3-after-start.webp`

### Filename Rules

Each uploaded file gets a safe unique name built from:

- timestamp
- short random suffix
- sanitized original filename stem
- extension derived from the original file type

This avoids collisions and reduces problems with spaces or non-ASCII filenames.

## Validation Rules

- Accept image files only.
- Reject empty file selections.
- Enforce a maximum file size of 10 MB.
- If validation fails, do not replace the previous stored value.
- If both a file and text path are provided, the file wins.

## Data Model Changes

### TriggerMessage

Add a nullable field:

- `imageUrl String?`

Reason:

- `/admin/triggers` currently has no way to store an image, so database support is required.
- The field stays nullable to preserve all existing records.

### Other Models

No schema changes are required for:

- `BotMenuButton.previewImageUrl`
- `FunnelStep.imagePath`
- `PhotoStyle.preview`

Those already store string paths and can accept uploaded-file results directly.

## Admin UX

### Shared Field Behavior

Every covered admin image field should present:

- the existing text field for manual URL/path entry
- a file chooser labeled as an alternative
- a small preview when the current value looks like an image path/URL

### Save Semantics

- Selecting a file and submitting the form saves the file and writes its public path.
- Leaving the file empty preserves the text field behavior exactly as today.
- Clearing the text field and not selecting a file results in an empty value only where the field is optional.
- Required image fields keep their existing required behavior.

### Trigger Page Behavior

`/admin/triggers` gets a new image field in both create and edit forms.

The trigger list itself may remain text-first in this phase; preview inside the edit/create forms is sufficient.

## Page-by-Page Changes

### `/admin/triggers`

- Add `imageUrl` support in create and update actions.
- Add image upload UI to create and edit forms.
- Persist uploaded file path into `TriggerMessage.imageUrl`.

### `/admin/chat-bot`

- Fix create action so `previewImageUrl` is actually persisted.
- Add file upload alongside the existing `previewImageUrl` input.
- Keep edit behavior aligned with create behavior.

### `/admin/funnel`

- Add file upload alongside `imagePath`.
- Continue allowing manual `/path` or absolute URL input.

### `/admin/photo-styles`

- Add file upload alongside preview path input.
- Preserve all existing preview string behavior.

## Server Implementation Notes

- The upload helper should live in a shared admin/server utility area, not inside a single page module.
- The helper should create target directories when missing.
- The helper should return `null` when no valid file was selected, allowing calling actions to fall back to manual input.
- Use Node/Next server capabilities already available in server actions; do not introduce external upload services.

## Error Handling

- Invalid file type: ignore replacement and keep current/manual value path logic.
- Oversized file: ignore replacement and keep current/manual value path logic.
- Disk write failure: action should fail clearly rather than silently storing a broken path.

This phase does not require polished inline validation messaging, but server behavior must be deterministic and safe.

## Testing Strategy

### Automated Tests

Add targeted tests for:

- upload helper validation and path generation
- trigger create/update actions with manual path only
- trigger create/update actions with uploaded file
- chat-bot create action regression for `previewImageUrl`
- funnel and photo-style action behavior when file is missing vs present

### Regression Coverage

The important regression is that existing string-only workflows must continue to work exactly as before.

## Rollout Notes

- Existing records continue to render because old paths/URLs remain valid.
- New uploads become regular static assets under `public/`.
- This approach assumes the deployment environment keeps uploaded files on persistent disk. If production storage is ephemeral, a later migration to object storage will be required.

## Open Decisions Resolved

- Scope: admin only
- Storage: local project storage
- Manual URL/path entry: kept
- Priority rule: uploaded file overrides manual text when both are provided

## Implementation Sequence

1. Add `TriggerMessage.imageUrl` migration.
2. Add shared upload helper.
3. Add shared admin image input component.
4. Update `/admin/triggers`.
5. Update `/admin/chat-bot`.
6. Update `/admin/funnel`.
7. Update `/admin/photo-styles`.
8. Add/adjust tests.

## Risks

- Local-disk uploads can be lost on non-persistent hosting.
- Without cleanup logic, replaced images remain on disk.
- Mixing file and text inputs across multiple existing forms may expose hidden form-data edge cases, so action tests are important.

## Success Criteria

- Admin can attach an image by file picker on all covered admin pages.
- Admin can still manually paste a path or URL on all covered admin pages.
- `/admin/triggers` can store and edit image-backed messages.
- Existing data continues to work without manual migration.
