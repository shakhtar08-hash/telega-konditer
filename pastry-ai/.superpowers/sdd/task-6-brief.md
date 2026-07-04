# Task 6: Integrate scheduleTrigger into /start

**Files:**
- Modify: `src/bot/commands/start.ts`

## Requirements

In `sendAccessAwareEntryPoint`, after `telegramId = user.telegramId;` (inside the `if (ctx.from)` block, before the access check), schedule an "after-start" trigger.

1. Import at top of file:
```typescript
import { createTriggerService } from "@/features/triggers/trigger-service";
import { prisma } from "@/db/prisma";
```

2. After `telegramId = user.telegramId;` (line 118), add:
```typescript
    const triggerService = createTriggerService({
      findActiveBySlug: async (slug) =>
        prisma.triggerMessage.findFirst({
          where: { slug, active: true },
        }) as Promise<any>,
      createScheduled: async (data) =>
        prisma.scheduledMessage.create({ data }) as Promise<any>,
      findExistingScheduled: async (triggerSlug, chatId) =>
        prisma.scheduledMessage.findFirst({
          where: { triggerSlug, chatId, sentAt: null },
          select: { id: true },
        }),
      findPendingScheduled: async () => [],
      markSent: async () => {},
    });

    await triggerService.scheduleTrigger(
      "after-start",
      telegramId,
      user.plan,
    );
```

## Verification

- `npm run typecheck` passes
- `npm run lint` passes