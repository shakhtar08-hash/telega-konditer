# Task 5: Admin CRUD Page for Triggers

**Files:**
- Create: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/layout.tsx`

## Requirements

### Layout changes

In `src/app/admin/layout.tsx`:

1. Add `Timer` to the lucide-react import:
```typescript
import { Timer } from "lucide-react";
```

2. Add nav link to `adminSections` array (after chat-bot entry):
```typescript
  { href: "/admin/triggers", label: "Триггеры" },
```

3. Add `Timer` icon to `sectionIcons` array (after Bot):
```typescript
  Timer,
```

### Triggers page

Create `src/app/admin/triggers/page.tsx` with the full CRUD from the plan. The file is ~250 lines. Use the existing admin form components: `AdminPanel`, `AdminField`, `AdminInput`, `AdminTextarea`, `AdminToggle`, `AdminButton` from `@/components/admin/form`, and `AdminPageHeader` from `@/components/admin/data-table`.

The page must include:
- Server actions: `createTriggerMessage`, `updateTriggerMessage`, `deleteTriggerMessage`
- List view of all triggers
- Create form
- Per-trigger edit forms with save/delete
- Tab navigation (Меню / Цепочки / Триггеры) with Триггеры active
- Info panel on the right explaining how triggers work

## Verification

- `npm run lint` passes
- `npm run typecheck` passes
- The page compiles without errors

## Exact code for the triggers page

Read it from the plan file: `docs/superpowers/plans/2026-07-04-trigger-messages-plan.md` (search for "Task 5: Admin CRUD Page for Triggers")