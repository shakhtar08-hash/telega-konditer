# Task 1: Extend Zod schema with nullable meta fields

**Files:**
- Modify: `src/ai/schemas/recipe-card.ts`

**Interfaces:**
- Consumes: existing `z` import
- Produces: `recipeCardOutputSchema` with nullable `difficulty`, `storage`, `weight`

**Steps:**

- [ ] Step 1: Update schema - change `meta` to include nullable fields
- [ ] Step 2: Run typecheck to verify
- [ ] Step 3: Commit

**Code to write:**

In `src/ai/schemas/recipe-card.ts`, change the `meta` object from:
```typescript
meta: z.object({
  time: z.string(),
  yield: z.string(),
}),
```

To:
```typescript
meta: z.object({
  time: z.string(),
  yield: z.string(),
  difficulty: z.string().nullable(),
  storage: z.string().nullable(),
  weight: z.string().nullable(),
}),
```