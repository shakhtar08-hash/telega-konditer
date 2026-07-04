# Task 7: Integrate scheduleTrigger into Payment Handler

**Files:**
- Modify: `src/app/api/payments/cloudpayments/route.ts`

## Requirements

After successful payment processing (after `prisma.$transaction`), schedule an "after-payment" trigger for the user.

1. Import at top of file:
```typescript
import { createTriggerService } from "@/features/triggers/trigger-service";
```

2. After the `prisma.$transaction` and before `return NextResponse.json({ code: 0 })`, add:
```typescript
  const user = await prisma.user.findUnique({
    where: { id: invoice.userId },
    select: { plan: true, telegramId: true },
  });

  if (user) {
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
      "after-payment",
      user.telegramId,
      user.plan,
    );
  }
```

## Verification

- `npm run typecheck` passes
- `npm run lint` passes