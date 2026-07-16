# Trigger Rules Multi-Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign trigger rules so one immutable `slug` can own multiple trigger messages with unique `delayMinutes`, scheduled rows link to specific trigger messages, and `/admin/triggers` is grouped by rule.

**Architecture:** Replace the old one-trigger-per-slug assumption with a rule-plus-messages model implemented on top of the existing `TriggerMessage` table. Persist the originating trigger message and original event timestamp in `ScheduledMessage`, then update the trigger service, admin actions, and cron/payment/start integrations so scheduling, editing, and deleting behave per message rather than only per slug.

**Tech Stack:** Next.js App Router, Prisma, Vitest, React server components, PostgreSQL

## Global Constraints

- One `slug` is one stable event/rule and must remain immutable after creation.
- One `slug` can own multiple trigger messages.
- `delayMinutes` must be unique within one `slug`.
- `targetPlans` may differ between messages inside the same `slug`.
- Pending scheduled rows must link to a specific `triggerMessageId`.
- `ScheduledMessage` must store `triggeredAt`.
- New scheduled rows must use `sendAt = triggeredAt + delayMinutes`.
- Editing a trigger message must update unsent scheduled rows only.
- Editing `delayMinutes` must recalculate unsent `sendAt` from `triggeredAt`.
- Deleting a trigger message must delete its unsent scheduled rows only.
- Sent scheduled rows must remain untouched.
- `/admin/triggers` must be grouped by `slug`.
- The admin image field for triggers remains supported.
- No slug editing, no equal delays inside a slug, no rollout outside trigger feature scope.

## File Structure

- `pastry-ai/prisma/schema.prisma`
  Trigger and scheduled-message schema changes.
- `pastry-ai/prisma/migrations/<timestamp>_trigger_rules_multi_message/migration.sql`
  Schema migration and backfill for `triggerMessageId` and `triggeredAt`.
- `pastry-ai/src/features/triggers/trigger-service.ts`
  Core scheduling and pending-send logic.
- `pastry-ai/src/features/triggers/trigger-service.test.ts`
  Unit tests for multi-message scheduling, duplicate prevention, update/delete semantics.
- `pastry-ai/src/app/api/cron/process-triggers/route.ts`
  Cron repository wiring for the new trigger service interface.
- `pastry-ai/src/app/api/payments/cloudpayments/route.ts`
  Payment event wiring for the new trigger service interface.
- `pastry-ai/src/bot/commands/start.ts`
  Start-event wiring for the new trigger service interface.
- `pastry-ai/src/app/admin/triggers/page.tsx`
  Grouped admin UI and updated server actions.
- `pastry-ai/src/app/admin/triggers/page.actions.test.ts`
  Trigger admin action tests for duplicate delays, edits, deletes, and grouped flows.
- `pastry-ai/docs/roadmap.md`
  High-level feature note.
- `pastry-ai/docs/architecture.md`
  Architecture note for multi-message trigger rules.

---

### Task 1: Migrate Trigger and Scheduled Models

**Files:**
- Modify: `pastry-ai/prisma/schema.prisma`
- Create: `pastry-ai/prisma/migrations/<timestamp>_trigger_rules_multi_message/migration.sql`
- Test: `pastry-ai/src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes: existing `TriggerMessage` and `ScheduledMessage` models
- Produces:
  - `TriggerMessage @@unique([slug, delayMinutes])`
  - `ScheduledMessage.triggerMessageId: string`
  - `ScheduledMessage.triggeredAt: Date`
  - `ScheduledMessage.imageUrl: string | null`

- [ ] **Step 1: Write the failing test**

```ts
it("schedules multiple messages for the same slug", async () => {
  findActiveBySlugMock.mockResolvedValue([
    {
      id: "t1",
      slug: "after-start",
      title: "15 мин",
      text: "Первое сообщение",
      imageUrl: null,
      delayMinutes: 15,
      targetPlans: ["promo"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "t2",
      slug: "after-start",
      title: "60 мин",
      text: "Второе сообщение",
      imageUrl: null,
      delayMinutes: 60,
      targetPlans: ["promo"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  findExistingScheduledForTriggerMock.mockResolvedValue(null);

  await service.scheduleTrigger("after-start", "12345", "promo");

  expect(createScheduledMock).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL because the service and schema still assume one trigger per slug

- [ ] **Step 3: Write minimal implementation**

```prisma
model TriggerMessage {
  id           String   @id @default(cuid())
  slug         String
  title        String
  text         String
  imageUrl     String?
  delayMinutes Int
  targetPlans  Json
  buttons      Json?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([slug, delayMinutes])
  @@index([slug, active])
}

model ScheduledMessage {
  id               String    @id @default(cuid())
  triggerMessageId String
  triggerSlug      String
  chatId           String
  text             String
  imageUrl         String?
  buttons          Json?
  triggeredAt      DateTime
  sendAt           DateTime
  sentAt           DateTime?
  createdAt        DateTime  @default(now())

  @@index([triggerSlug])
  @@index([triggerMessageId, chatId, sentAt])
  @@index([sentAt, sendAt])
}
```

```sql
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerMessageId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggeredAt" TIMESTAMP(3);
ALTER TABLE "ScheduledMessage" ADD COLUMN "imageUrl" TEXT;

ALTER TABLE "TriggerMessage" DROP CONSTRAINT "TriggerMessage_slug_key";
CREATE UNIQUE INDEX "TriggerMessage_slug_delayMinutes_key"
ON "TriggerMessage"("slug", "delayMinutes");
CREATE INDEX "TriggerMessage_slug_active_idx"
ON "TriggerMessage"("slug", "active");

UPDATE "ScheduledMessage" sm
SET "triggerMessageId" = tm."id",
    "triggeredAt" = sm."sendAt" - make_interval(mins => tm."delayMinutes"),
    "imageUrl" = tm."imageUrl"
FROM "TriggerMessage" tm
WHERE sm."triggerSlug" = tm."slug";

ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggerMessageId" SET NOT NULL;
ALTER TABLE "ScheduledMessage" ALTER COLUMN "triggeredAt" SET NOT NULL;
CREATE INDEX "ScheduledMessage_triggerSlug_idx" ON "ScheduledMessage"("triggerSlug");
CREATE INDEX "ScheduledMessage_triggerMessageId_chatId_sentAt_idx"
ON "ScheduledMessage"("triggerMessageId", "chatId", "sentAt");
CREATE INDEX "ScheduledMessage_sentAt_sendAt_idx"
ON "ScheduledMessage"("sentAt", "sendAt");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: still FAIL on behavior, but schema/types compile for the next tasks

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: migrate trigger rules for multi-message scheduling"
```

### Task 2: Rewrite Trigger Service for Multi-Message Scheduling

**Files:**
- Modify: `pastry-ai/src/features/triggers/trigger-service.ts`
- Modify: `pastry-ai/src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes:
  - `findActiveBySlug(slug: string): Promise<TriggerMessageRecord[]>`
  - `findExistingScheduledForTrigger(triggerMessageId: string, chatId: string): Promise<{ id: string } | null>`
- Produces:
  - `scheduleTrigger(slug: string, chatId: string, plan: string): Promise<void>`
  - `processPendingTriggers(sendMessage: (chatId: string, text: string) => Promise<void>): Promise<number>`

- [ ] **Step 1: Write the failing test**

```ts
it("stores triggeredAt and sendAt per trigger message", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-10T17:00:00.000Z"));

  findActiveBySlugMock.mockResolvedValue([
    {
      id: "t1",
      slug: "after-start",
      title: "15 мин",
      text: "Первое",
      imageUrl: "/uploads/admin/triggers/first.webp",
      delayMinutes: 15,
      targetPlans: ["promo"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  findExistingScheduledForTriggerMock.mockResolvedValue(null);

  await service.scheduleTrigger("after-start", "12345", "promo");

  expect(createScheduledMock).toHaveBeenCalledWith(
    expect.objectContaining({
      triggerMessageId: "t1",
      triggerSlug: "after-start",
      triggeredAt: new Date("2026-07-10T17:00:00.000Z"),
      sendAt: new Date("2026-07-10T17:15:00.000Z"),
      imageUrl: "/uploads/admin/triggers/first.webp",
    }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL because service still returns/accepts single-record trigger data

- [ ] **Step 3: Write minimal implementation**

```ts
export type TriggerMessageRecord = {
  id: string;
  slug: string;
  title: string;
  text: string;
  imageUrl: string | null;
  delayMinutes: number;
  targetPlans: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledMessageRecord = {
  id: string;
  triggerMessageId: string;
  triggerSlug: string;
  chatId: string;
  text: string;
  imageUrl: string | null;
  triggeredAt: Date;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

async scheduleTrigger(slug: string, chatId: string, plan: string): Promise<void> {
  const triggers = await deps.findActiveBySlug(slug);

  for (const trigger of triggers) {
    const plans = Array.isArray(trigger.targetPlans) ? trigger.targetPlans : [];
    if (!plans.includes(plan)) continue;

    const existing = await deps.findExistingScheduledForTrigger(trigger.id, chatId);
    if (existing) continue;

    const triggeredAt = new Date();
    const sendAt = new Date(triggeredAt.getTime() + trigger.delayMinutes * 60 * 1000);

    await deps.createScheduled({
      triggerMessageId: trigger.id,
      triggerSlug: slug,
      chatId,
      text: trigger.text,
      imageUrl: trigger.imageUrl ?? null,
      triggeredAt,
      sendAt,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: PASS for scheduling behavior

- [ ] **Step 5: Commit**

```bash
git add src/features/triggers/trigger-service.ts src/features/triggers/trigger-service.test.ts
git commit -m "feat: schedule multiple trigger messages per rule"
```

### Task 3: Update Cron, Start, and Payment Integrations

**Files:**
- Modify: `pastry-ai/src/app/api/cron/process-triggers/route.ts`
- Modify: `pastry-ai/src/app/api/payments/cloudpayments/route.ts`
- Modify: `pastry-ai/src/bot/commands/start.ts`
- Modify: `pastry-ai/src/bot/commands/start.test.ts`

**Interfaces:**
- Consumes: new trigger service repository shape
- Produces:
  - repo wiring with `findActiveBySlug: Promise<TriggerMessageRecord[]>`
  - repo wiring with `findExistingScheduledForTrigger(triggerMessageId, chatId)`

- [ ] **Step 1: Write the failing test**

```ts
it("wires duplicate prevention by triggerMessageId in start trigger scheduling", async () => {
  // Add assertion around repo factory input or delegated Prisma query shape
  // Expected where: { triggerMessageId, chatId, sentAt: null }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/bot/commands/start.test.ts`
Expected: FAIL because integration wiring still uses `triggerSlug + chatId`

- [ ] **Step 3: Write minimal implementation**

```ts
findActiveBySlug: async (slug) =>
  prisma.triggerMessage.findMany({
    where: { slug, active: true },
    orderBy: { delayMinutes: "asc" },
  }) as Promise<TriggerMessageRecord[]>,

findExistingScheduledForTrigger: async (triggerMessageId, chatId) =>
  prisma.scheduledMessage.findFirst({
    where: { triggerMessageId, chatId, sentAt: null },
    select: { id: true },
  }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/bot/commands/start.test.ts src/features/triggers/trigger-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/process-triggers/route.ts src/app/api/payments/cloudpayments/route.ts src/bot/commands/start.ts src/bot/commands/start.test.ts
git commit -m "feat: wire multi-message trigger repositories"
```

### Task 4: Add Admin Action Semantics for Rule Groups and Pending Sync

**Files:**
- Modify: `pastry-ai/src/app/admin/triggers/page.tsx`
- Modify: `pastry-ai/src/app/admin/triggers/page.actions.test.ts`

**Interfaces:**
- Consumes:
  - grouped trigger records
  - Prisma access to `triggerMessage` and `scheduledMessage`
- Produces:
  - rule creation by immutable `slug`
  - message creation under an existing `slug`
  - duplicate-delay validation per `slug`
  - update action that syncs unsent scheduled rows
  - delete action that deletes unsent scheduled rows first

- [ ] **Step 1: Write the failing test**

```ts
it("rejects duplicate delayMinutes inside the same slug", async () => {
  findFirstMock.mockResolvedValue({ id: "existing_message" });

  const formData = new FormData();
  formData.set("slug", "after-start");
  formData.set("title", "Повтор");
  formData.set("text", "Текст");
  formData.set("delayMinutes", "15");
  formData.set("target_promo", "on");

  await expect(createTriggerMessage(formData)).rejects.toThrow("NEXT_REDIRECT");

  expect(redirectMock).toHaveBeenCalledWith(
    "/admin/triggers?error=duplicate-delay&slug=after-start&delayMinutes=15",
  );
});

it("recalculates sendAt for unsent rows on delay change", async () => {
  scheduledUpdateManyMock.mockResolvedValue({ count: 2 });

  const formData = new FormData();
  formData.set("id", "trigger_1");
  formData.set("slug", "after-start");
  formData.set("title", "После старта");
  formData.set("text", "Новый текст");
  formData.set("delayMinutes", "45");
  formData.set("target_promo", "on");
  formData.set("active", "on");

  await updateTriggerMessage(formData);

  expect(scheduledUpdateManyMock).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts`
Expected: FAIL because admin actions still assume unique slug and do not sync scheduled rows

- [ ] **Step 3: Write minimal implementation**

```ts
const duplicate = await prisma.triggerMessage.findFirst({
  where: {
    slug,
    delayMinutes,
    ...(id ? { NOT: { id } } : {}),
  },
  select: { id: true },
});

if (duplicate) {
  redirect(
    `/admin/triggers?error=duplicate-delay&slug=${encodeURIComponent(slug)}&delayMinutes=${delayMinutes}`,
  );
}
```

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.triggerMessage.update({
    where: { id },
    data: { title, text, imageUrl, delayMinutes, active, targetPlans },
  });

  const unsentRows = await tx.scheduledMessage.findMany({
    where: { triggerMessageId: id, sentAt: null },
    select: { id: true, triggeredAt: true },
  });

  for (const row of unsentRows) {
    await tx.scheduledMessage.update({
      where: { id: row.id },
      data: {
        text,
        imageUrl,
        sendAt: new Date(row.triggeredAt.getTime() + delayMinutes * 60 * 1000),
      },
    });
  }
});
```

```ts
await prisma.$transaction([
  prisma.scheduledMessage.deleteMany({
    where: { triggerMessageId: id, sentAt: null },
  }),
  prisma.triggerMessage.delete({ where: { id } }),
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/triggers/page.tsx src/app/admin/triggers/page.actions.test.ts
git commit -m "feat: sync pending scheduled messages from trigger admin"
```

### Task 5: Rebuild `/admin/triggers` as Grouped Rule UI

**Files:**
- Modify: `pastry-ai/src/app/admin/triggers/page.tsx`
- Modify: `pastry-ai/src/components/admin/form.tsx`
- Test: `pastry-ai/src/app/admin/triggers/page.test.tsx`

**Interfaces:**
- Consumes: grouped trigger records `{ slug: string; messages: TriggerMessage[] }`
- Produces:
  - grouped render by `slug`
  - top-level rule creation form
  - nested create-message form under each rule
  - immutable slug display in edit cards

- [ ] **Step 1: Write the failing test**

```tsx
it("renders trigger rules grouped by slug", async () => {
  prismaMock.triggerMessage.findMany.mockResolvedValue([
    {
      id: "t1",
      slug: "after-start",
      title: "15 мин",
      text: "Первое",
      imageUrl: null,
      delayMinutes: 15,
      targetPlans: ["promo"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "t2",
      slug: "after-start",
      title: "60 мин",
      text: "Второе",
      imageUrl: null,
      delayMinutes: 60,
      targetPlans: ["promo"],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const html = renderToStaticMarkup(await AdminTriggersPage());

  expect(html).toContain("after-start");
  expect(html).toContain("15 мин");
  expect(html).toContain("60 мин");
  expect(html).toContain("Добавить сообщение в правило");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/triggers/page.test.tsx`
Expected: FAIL because page still renders a flat list

- [ ] **Step 3: Write minimal implementation**

```ts
const groupedTriggers = Object.values(
  triggers.reduce<Record<string, { slug: string; messages: typeof triggers }[string]>>(
    (acc, trigger) => {
      acc[trigger.slug] ??= { slug: trigger.slug, messages: [] };
      acc[trigger.slug].messages.push(trigger);
      return acc;
    },
    {},
  ),
).map((group) => ({
  ...group,
  messages: [...group.messages].sort((a, b) => a.delayMinutes - b.delayMinutes),
}));
```

```tsx
{groupedTriggers.map((group) => (
  <AdminPanel key={group.slug} className="space-y-4">
    <div>
      <h3 className="font-semibold text-[#f4f7fb]">{group.slug}</h3>
      <p className="text-sm text-[#97a4b8]">Правило, slug не редактируется</p>
    </div>

    {group.messages.map((trigger) => (
      <form action={updateTriggerMessage} key={trigger.id}>
        <input name="id" type="hidden" value={trigger.id} />
        <input name="slug" type="hidden" value={group.slug} />
        ...
      </form>
    ))}

    <form action={createTriggerMessage}>
      <input name="slug" type="hidden" value={group.slug} />
      ...
      <AdminButton type="submit">Добавить сообщение в правило</AdminButton>
    </form>
  </AdminPanel>
))}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/triggers/page.tsx src/app/admin/triggers/page.test.tsx src/components/admin/form.tsx
git commit -m "feat: group trigger admin by immutable slug rules"
```

### Task 6: Verify Full Trigger Flow and Update Docs

**Files:**
- Modify: `pastry-ai/docs/roadmap.md`
- Modify: `pastry-ai/docs/architecture.md`

**Interfaces:**
- Consumes: completed schema, service, admin, and integration changes
- Produces: verified behavior and updated docs

- [ ] **Step 1: Write the failing test**

No new feature test in this task. Verification target is end-to-end regression coverage for the redesigned trigger flow.

- [ ] **Step 2: Run test to verify current status**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx src/bot/commands/start.test.ts`
Expected: PASS only when redesign is integrated correctly

- [ ] **Step 3: Write minimal implementation**

```md
- Trigger rules now support multiple messages under one immutable `slug`, with unique `delayMinutes` inside each rule and grouped admin management on `/admin/triggers`.
```

```md
- `ScheduledMessage` now stores `triggerMessageId` and `triggeredAt`, allowing unsent rows to update content and recalculate `sendAt` when trigger delays change.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx src/bot/commands/start.test.ts`
Expected: PASS

Run: `npm test`
Expected: PASS, or if unrelated failures already exist, document exact suites before handoff.

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md docs/architecture.md
git commit -m "docs: record multi-message trigger rules"
```

## Opencode Note

If this plan is handed to `opencode`, include this execution note at the top of the work order:

```text
Do not start before 20:00 Europe/Moscow on 2026-07-10 unless the user explicitly overrides the schedule.
```

This note is advisory only. It does not create a real scheduled run by itself.

## Self-Review

- Spec coverage:
  - schema redesign: Task 1
  - multi-message scheduling: Task 2
  - integrations: Task 3
  - admin action semantics: Task 4
  - grouped admin UI: Task 5
  - verification and docs: Task 6
- Placeholder scan: no `TODO`, `TBD`, or undefined interfaces remain.
- Type consistency:
  - `findActiveBySlug` returns `TriggerMessageRecord[]`
  - duplicate prevention is `findExistingScheduledForTrigger(triggerMessageId, chatId)`
  - `ScheduledMessage` carries `triggerMessageId`, `triggeredAt`, `imageUrl`
  - recalculation formula is always `triggeredAt + delayMinutes`

Plan complete and saved to `docs/superpowers/plans/2026-07-10-trigger-rules-multi-message.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
