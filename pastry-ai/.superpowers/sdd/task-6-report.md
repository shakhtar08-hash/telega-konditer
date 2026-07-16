# Task 6 Report: Update AI prompt and migrate database

## What I did

1. **Updated `prisma/seed.mjs`** — appended the RECIPE METADATA section to the recipe-card system prompt and bumped `version` from 2 to 3.
2. **Created `scripts/fix-recipe-card-prompt-v2.ts`** — migration script that deactivates the current active prompt (v2) and creates a new prompt (v3) with the appended RECIPE METADATA block.
3. **Ran the migration script** — successfully created version 3.
4. **Committed** the changes.

## Migration script output

```
Created recipe-card prompt version 3 with RECIPE METADATA section.
```

## Commit

```
44cd061 feat(recipe-card): update AI prompt with RECIPE METADATA section
```

## Concerns

- The `.superpowers/sdd/task-4-report.md` and `.superpowers/sdd/task-6-brief.md` files are not tracked in the repo (they were staged but I un-staged them before committing). They should be added to `.gitignore` if they should never be committed.
- Need to ensure the `docs/prompts.md` document is updated to reflect the new RECIPE METADATA section in the recipe-card prompt.