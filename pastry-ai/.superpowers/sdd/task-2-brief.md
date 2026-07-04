# Task 2: Environment Variable CRON_SECRET

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

## Steps

### Step 1: Add CRON_SECRET to env schema

In `src/lib/env.ts`, add to the `envSchema` object (after existing fields):

```typescript
  CRON_SECRET: z.string().min(1),
```

### Step 2: Add to .env.example

Add line at end of `.env.example`:
```
CRON_SECRET=your-cron-secret-here
```

## Verification

- `npm run lint` passes
- `npm run typecheck` passes