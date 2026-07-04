# Task 4: Cron API Route

**Files:**
- Create: `src/app/api/cron/process-triggers/route.ts`

## Requirements

Create a GET endpoint at `/api/cron/process-triggers?token=<CRON_SECRET>` that processes pending trigger messages.

The route must:
1. Validate the `token` query parameter against `env.CRON_SECRET`
2. Create trigger service with Prisma dependencies
3. Process pending triggers using bot API to send messages
4. Return JSON with `{ ok: true, sent: <count> }`

## Implementation

`src/app/api/cron/process-triggers/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from "@/db/prisma";
import { loadEnv } from "@/lib/env";
import { createTriggerService } from "@/features/triggers/trigger-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const env = loadEnv();

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    findPendingScheduled: async (limit) =>
      prisma.scheduledMessage.findMany({
        orderBy: { sendAt: "asc" },
        take: limit,
        where: {
          sentAt: null,
          sendAt: { lte: new Date() },
        },
      }) as Promise<any>,

    markSent: async (id) =>
      prisma.scheduledMessage.update({
        data: { sentAt: new Date() },
        where: { id },
      }),
  });

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  const sent = await triggerService.processPendingTriggers(
    async (chatId, text) => {
      await bot.api.sendMessage(chatId, text);
    },
  );

  return NextResponse.json({ ok: true, sent });
}
```

## Verification

- `npm run typecheck` passes
- `npm run lint` passes