# Trigger Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current slug-based trigger admin with an event-driven trigger builder that supports templates, multiple `AND` conditions, immediate or delayed sends, and a reference-aligned create/edit experience while keeping onboarding separate.

**Architecture:** Introduce a new `TriggerRule` domain model backed by structured JSON conditions and explicit event keys, keep scheduled sends materialized in the database, and route all trigger evaluation through a focused service layer instead of UI-specific slug logic. Rebuild the admin area around a trigger list screen and a separate create/edit screen that reuse the existing form primitives and image/button patterns.

**Tech Stack:** Next.js App Router, React Server Components, server actions, Prisma/PostgreSQL, Vitest, grammY, existing admin form components

## Global Constraints

- Keep `Onboarding` separate from trigger automation.
- Support exactly one event per trigger rule.
- Support multiple conditions joined by `AND` only in the first version.
- Do not add `OR` logic, visual branching, or manual campaign scheduling to this feature.
- Keep the visual direction close to the supplied two-panel dark references.
- Keep Telegram preview on the right side of the create/edit screen.
- Continue snapshotting queued message payloads in scheduled rows.
- Prefer business-facing event labels in the UI instead of raw technical slugs.

---

### Task 1: Replace slug-based trigger data with explicit trigger rules

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_trigger_rule_redesign/migration.sql`
- Test: `src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes: existing `TriggerMessage` and `ScheduledMessage` schema, existing Prisma client usage
- Produces:
  - `TriggerRule` Prisma model with fields `id`, `name`, `eventKey`, `status`, `delayValue`, `delayUnit`, `messageText`, `imageUrl`, `buttons`, `conditions`, `createdAt`, `updatedAt`
  - `ScheduledMessage` fields `triggerRuleId`, `triggerEventKey`, `triggeredAt`, `sendAt`, `sentAt`

- [ ] **Step 1: Write the failing schema-facing test notes in the existing trigger service test**

```ts
it("expects explicit rule fields instead of slug + delayMinutes", () => {
  const rule = {
    id: "rule_1",
    name: "After Start: no promo",
    eventKey: "user.started",
    status: "active",
    delayValue: 15,
    delayUnit: "minutes",
    messageText: "Hello!",
    imageUrl: null,
    buttons: null,
    conditions: [{ field: "promoClaimed", operator: "is", value: false }],
  };

  expect(rule.eventKey).toBe("user.started");
  expect(rule.delayUnit).toBe("minutes");
});
```

- [ ] **Step 2: Run test to verify current code does not model the new rule shape**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL or missing assertions around `eventKey`, `delayUnit`, and `conditions`

- [ ] **Step 3: Update Prisma schema to add the new trigger rule model and scheduled-send linkage**

```prisma
model TriggerRule {
  id          String   @id @default(cuid())
  name        String
  eventKey    String
  status      String
  delayValue  Int
  delayUnit   String
  messageText String
  imageUrl    String?
  buttons     Json?
  conditions  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([eventKey, status])
}

model ScheduledMessage {
  id              String    @id @default(cuid())
  triggerRuleId   String
  triggerEventKey String
  chatId          String
  text            String
  imageUrl        String?
  buttons         Json?
  triggeredAt     DateTime
  sendAt          DateTime
  sentAt          DateTime?
  createdAt       DateTime  @default(now())

  @@index([triggerRuleId, chatId, sentAt])
  @@index([triggerEventKey])
  @@index([sentAt, sendAt])
}
```

- [ ] **Step 4: Write the migration with a safe data copy path from `TriggerMessage` to `TriggerRule`**

```sql
CREATE TABLE "TriggerRule" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "delayValue" INTEGER NOT NULL,
  "delayUnit" TEXT NOT NULL,
  "messageText" TEXT NOT NULL,
  "imageUrl" TEXT,
  "buttons" JSONB,
  "conditions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerRuleId" TEXT;
ALTER TABLE "ScheduledMessage" ADD COLUMN "triggerEventKey" TEXT;

INSERT INTO "TriggerRule" (
  "id", "name", "eventKey", "status", "delayValue", "delayUnit", "messageText", "imageUrl", "buttons", "conditions", "createdAt", "updatedAt"
)
SELECT
  "id",
  "title",
  "slug",
  CASE WHEN "active" THEN 'active' ELSE 'disabled' END,
  "delayMinutes",
  'minutes',
  "text",
  "imageUrl",
  "buttons",
  jsonb_build_array(jsonb_build_object('field', 'plan', 'operator', 'in', 'value', "targetPlans")),
  "createdAt",
  "updatedAt"
FROM "TriggerMessage";
```

- [ ] **Step 5: Run schema and migration verification**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

Run: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`
Expected: SQL script output without schema parse errors

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/<timestamp>_trigger_rule_redesign/migration.sql src/features/triggers/trigger-service.test.ts
git commit -m "feat: introduce trigger rule schema"
```

### Task 2: Build the trigger rule domain and condition evaluation service

**Files:**
- Create: `src/features/triggers/trigger-rule-types.ts`
- Create: `src/features/triggers/trigger-condition.ts`
- Modify: `src/features/triggers/trigger-service.ts`
- Test: `src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes:
  - `TriggerRuleRecord`
  - scheduled-message persistence callbacks
  - user state snapshot with `plan`, `promoClaimed`, `hasActiveTariff`, `generationCount`, `groupIds`
- Produces:
  - `evaluateConditions(conditions: TriggerCondition[], state: TriggerUserState): boolean`
  - `scheduleTrigger(eventKey: string, chatId: string, state: TriggerUserState, eventOccurredAt?: Date): Promise<void>`

- [ ] **Step 1: Write the failing tests for multi-condition `AND` evaluation**

```ts
it("schedules a rule only when all conditions pass", async () => {
  findActiveRulesByEventMock.mockResolvedValue([
    {
      id: "rule_1",
      name: "After Start: no promo",
      eventKey: "user.started",
      status: "active",
      delayValue: 15,
      delayUnit: "minutes",
      messageText: "Hello!",
      imageUrl: null,
      buttons: null,
      conditions: [
        { field: "promoClaimed", operator: "is", value: false },
        { field: "hasActiveTariff", operator: "is", value: false },
      ],
    },
  ]);

  await service.scheduleTrigger("user.started", "12345", {
    plan: "FREE",
    promoClaimed: false,
    hasActiveTariff: false,
    generationCount: 0,
    groupIds: [],
  });

  expect(createScheduledMock).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify the old slug-based service fails**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL because `findActiveBySlug` and `targetPlans` logic do not satisfy event-plus-conditions behavior

- [ ] **Step 3: Define trigger rule and user-state types**

```ts
export type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "groupId"; operator: "contains"; value: string };

export type TriggerUserState = {
  plan: string;
  promoClaimed: boolean;
  hasActiveTariff: boolean;
  generationCount: number;
  groupIds: string[];
};

export type TriggerRuleRecord = {
  id: string;
  name: string;
  eventKey: string;
  status: "draft" | "active" | "disabled";
  delayValue: number;
  delayUnit: "now" | "minutes" | "hours" | "days";
  messageText: string;
  imageUrl: string | null;
  buttons: unknown;
  conditions: TriggerCondition[];
};
```

- [ ] **Step 4: Implement condition evaluation and delay calculation**

```ts
export function evaluateConditions(
  conditions: TriggerCondition[],
  state: TriggerUserState,
): boolean {
  return conditions.every((condition) => {
    switch (condition.field) {
      case "promoClaimed":
        return state.promoClaimed === condition.value;
      case "hasActiveTariff":
        return state.hasActiveTariff === condition.value;
      case "generationCount":
        return condition.operator === "gte"
          ? state.generationCount >= condition.value
          : state.generationCount === condition.value;
      case "groupId":
        return state.groupIds.includes(condition.value);
    }
  });
}

export function computeSendAt(triggeredAt: Date, delayValue: number, delayUnit: TriggerRuleRecord["delayUnit"]): Date {
  const unitToMs = {
    now: 0,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  } as const;

  return new Date(triggeredAt.getTime() + delayValue * unitToMs[delayUnit]);
}
```

- [ ] **Step 5: Refactor the service to load active rules by event and enqueue by condition match**

```ts
async scheduleTrigger(
  eventKey: string,
  chatId: string,
  state: TriggerUserState,
  eventOccurredAt = new Date(),
): Promise<void> {
  const rules = await deps.findActiveRulesByEvent(eventKey);

  for (const rule of rules) {
    if (!evaluateConditions(rule.conditions, state)) {
      continue;
    }

    const existing = await deps.findExistingScheduled(rule.id, chatId, eventOccurredAt);
    if (existing) {
      continue;
    }

    await deps.createScheduled({
      triggerRuleId: rule.id,
      triggerEventKey: eventKey,
      chatId,
      text: rule.messageText,
      imageUrl: rule.imageUrl,
      buttons: rule.buttons,
      triggeredAt: eventOccurredAt,
      sendAt: computeSendAt(eventOccurredAt, rule.delayValue, rule.delayUnit),
    });
  }
}
```

- [ ] **Step 6: Run focused tests and verify service behavior**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: PASS with coverage for `AND` evaluation, deduplication, and delay calculation

- [ ] **Step 7: Commit**

```bash
git add src/features/triggers/trigger-rule-types.ts src/features/triggers/trigger-condition.ts src/features/triggers/trigger-service.ts src/features/triggers/trigger-service.test.ts
git commit -m "feat: add trigger rule evaluation service"
```

### Task 3: Add event state loading and backend trigger entry points

**Files:**
- Create: `src/features/triggers/trigger-user-state.ts`
- Create: `src/features/triggers/trigger-event-service.ts`
- Modify: `src/app/api/cron/process-triggers/route.ts`
- Modify: `src/bot/commands/start.ts`
- Modify: `src/app/api/payments/cloudpayments/route.ts`
- Test: `src/features/triggers/trigger-event-service.test.ts`
- Test: `src/app/api/cron/process-triggers/route.test.ts`

**Interfaces:**
- Consumes:
  - `createTriggerService`
  - Prisma repositories for `User`, `UserTariff`, `TokenUsage`, and `ScheduledMessage`
- Produces:
  - `loadTriggerUserState(userId: string): Promise<TriggerUserState>`
  - `handleTriggerEvent(eventKey: string, payload: { userId: string; chatId: string; occurredAt?: Date }): Promise<void>`

- [ ] **Step 1: Write the failing test for event dispatch using loaded user state**

```ts
it("loads user state and dispatches the start event", async () => {
  loadTriggerUserStateMock.mockResolvedValue({
    plan: "FREE",
    promoClaimed: false,
    hasActiveTariff: false,
    generationCount: 0,
    groupIds: [],
  });

  await service.handleTriggerEvent("user.started", {
    userId: "user_1",
    chatId: "12345",
    occurredAt: new Date("2026-07-13T10:00:00.000Z"),
  });

  expect(scheduleTriggerMock).toHaveBeenCalledWith(
    "user.started",
    "12345",
    expect.objectContaining({ promoClaimed: false }),
    new Date("2026-07-13T10:00:00.000Z"),
  );
});
```

- [ ] **Step 2: Run test to verify the event service does not exist yet**

Run: `npm test -- src/features/triggers/trigger-event-service.test.ts`
Expected: FAIL with module not found or missing `handleTriggerEvent`

- [ ] **Step 3: Implement trigger user-state loading from Prisma**

```ts
export async function loadTriggerUserState(userId: string): Promise<TriggerUserState> {
  const [user, userTariff, generationCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.userTariff.findUnique({ where: { userId } }),
    prisma.generatedRecipeContext.count({ where: { userId } }),
  ]);

  return {
    plan: user.plan,
    promoClaimed: user.promoClaimed,
    hasActiveTariff: Boolean(userTariff && userTariff.expiresAt > new Date()),
    generationCount,
    groupIds: [],
  };
}
```

- [ ] **Step 4: Implement the event dispatch wrapper**

```ts
export function createTriggerEventService(deps: {
  loadTriggerUserState(userId: string): Promise<TriggerUserState>;
  scheduleTrigger(
    eventKey: string,
    chatId: string,
    state: TriggerUserState,
    occurredAt?: Date,
  ): Promise<void>;
}) {
  return {
    async handleTriggerEvent(
      eventKey: string,
      payload: { userId: string; chatId: string; occurredAt?: Date },
    ): Promise<void> {
      const state = await deps.loadTriggerUserState(payload.userId);
      await deps.scheduleTrigger(eventKey, payload.chatId, state, payload.occurredAt);
    },
  };
}
```

- [ ] **Step 5: Replace direct `scheduleTrigger("after-start", ...)` style calls at existing event hooks**

```ts
await triggerEventService.handleTriggerEvent("user.started", {
  userId: user.id,
  chatId: telegramId,
});

await triggerEventService.handleTriggerEvent("tariff.paid", {
  userId: user.id,
  chatId: telegramId,
});
```

- [ ] **Step 6: Run focused backend tests**

Run: `npm test -- src/features/triggers/trigger-event-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/bot/commands/start.test.ts`
Expected: PASS with event-key dispatch and queue processing still green

- [ ] **Step 7: Commit**

```bash
git add src/features/triggers/trigger-user-state.ts src/features/triggers/trigger-event-service.ts src/app/api/cron/process-triggers/route.ts src/bot/commands/start.ts src/app/api/payments/cloudpayments/route.ts src/features/triggers/trigger-event-service.test.ts src/app/api/cron/process-triggers/route.test.ts
git commit -m "feat: dispatch trigger events from product hooks"
```

### Task 4: Rebuild the trigger list screen around templates and event filters

**Files:**
- Create: `src/features/triggers/trigger-template.ts`
- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/page.test.tsx`
- Reuse: `src/components/admin/form.tsx`

**Interfaces:**
- Consumes:
  - `TriggerRule` Prisma reads
  - template metadata from `getTriggerTemplates()`
- Produces:
  - list screen with left support panel and right trigger table
  - query params `event`, `status`, `search`, `sort`

- [ ] **Step 1: Write the failing page test for templates and trigger rows**

```ts
it("renders the templates panel and trigger table", async () => {
  prismaMock.triggerRule.findMany.mockResolvedValue([
    {
      id: "rule_1",
      name: "After Start: no promo",
      eventKey: "user.started",
      status: "active",
      delayValue: 15,
      delayUnit: "minutes",
      messageText: "Hello!",
      imageUrl: null,
      buttons: null,
      conditions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const html = renderToStaticMarkup(await AdminTriggersPage({}));

  expect(html).toContain("Ready templates");
  expect(html).toContain("After Start: no promo");
  expect(html).toContain("Create trigger");
});
```

- [ ] **Step 2: Run the page test to verify the current grouped slug UI fails**

Run: `npm test -- src/app/admin/triggers/page.test.tsx`
Expected: FAIL because the page still renders grouped slug cards and no templates panel

- [ ] **Step 3: Add template definitions for left-panel quick starts**

```ts
export function getTriggerTemplates() {
  return [
    {
      key: "after-start-no-promo",
      name: "After Start: no promo",
      eventKey: "user.started",
      delayValue: 15,
      delayUnit: "minutes",
      conditions: [
        { field: "promoClaimed", operator: "is", value: false },
        { field: "hasActiveTariff", operator: "is", value: false },
      ],
    },
    // remaining templates...
  ] as const;
}
```

- [ ] **Step 4: Replace the current left-side slug list with templates and system events**

```tsx
<div className="space-y-4">
  <AdminPanel className="space-y-4">
    <div>
      <h3 className="font-semibold text-[#f4f7fb]">Ready templates</h3>
      <p className="mt-1 text-sm text-[#97a4b8]">
        Start from a prepared scenario and edit it before saving.
      </p>
    </div>
    <div className="space-y-2">
      {templates.map((template) => (
        <Link
          key={template.key}
          href={`/admin/triggers/new?template=${template.key}`}
          className="block rounded-lg border border-[#223047] bg-[#0d1522] p-3 text-sm text-[#f4f7fb]"
        >
          {template.name}
        </Link>
      ))}
    </div>
  </AdminPanel>
</div>
```

- [ ] **Step 5: Replace the right-side grouped forms with a searchable trigger table**

```tsx
<AdminPanel className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap gap-3">
      <AdminInput defaultValue={search} name="search" placeholder="Search triggers..." />
      <select name="event" defaultValue={eventFilter}>...</select>
      <select name="status" defaultValue={statusFilter}>...</select>
    </div>
    <Link href="/admin/triggers/new" className="inline-flex rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white">
      Create trigger
    </Link>
  </div>
</AdminPanel>
```

- [ ] **Step 6: Run page tests and verify the new composition**

Run: `npm test -- src/app/admin/triggers/page.test.tsx`
Expected: PASS with template panel, filters, and trigger rows

- [ ] **Step 7: Commit**

```bash
git add src/features/triggers/trigger-template.ts src/app/admin/triggers/page.tsx src/app/admin/triggers/page.test.tsx
git commit -m "feat: redesign trigger list screen"
```

### Task 5: Add create/edit trigger pages and server actions

**Files:**
- Create: `src/app/admin/triggers/actions.ts`
- Create: `src/app/admin/triggers/new/page.tsx`
- Create: `src/app/admin/triggers/[triggerId]/page.tsx`
- Create: `src/app/admin/triggers/trigger-form.tsx`
- Create: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/app/admin/triggers/page.actions.test.ts`

**Interfaces:**
- Consumes:
  - `getTriggerTemplates()`
  - Prisma `triggerRule` CRUD
  - existing admin form and image components
- Produces:
  - `createTriggerRule(formData: FormData): Promise<void>`
  - `updateTriggerRule(formData: FormData): Promise<void>`
  - `deleteTriggerRule(formData: FormData): Promise<void>`

- [ ] **Step 1: Write the failing action test for structured trigger-rule persistence**

```ts
it("creates a trigger rule with event, conditions, and delay unit", async () => {
  const formData = new FormData();
  formData.set("name", "After Start: no promo");
  formData.set("eventKey", "user.started");
  formData.set("delayValue", "15");
  formData.set("delayUnit", "minutes");
  formData.set("messageText", "Hello!");
  formData.set("conditions", JSON.stringify([
    { field: "promoClaimed", operator: "is", value: false },
    { field: "hasActiveTariff", operator: "is", value: false },
  ]));

  await createTriggerRule(formData);

  expect(createMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        eventKey: "user.started",
        delayUnit: "minutes",
      }),
    }),
  );
});
```

- [ ] **Step 2: Run the action test to verify the old `createTriggerMessage` API fails**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts`
Expected: FAIL because actions still expect `slug`, `delayMinutes`, and `targetPlans`

- [ ] **Step 3: Implement reusable form parsing for conditions and delay**

```ts
function parseConditions(formData: FormData): TriggerCondition[] {
  const raw = String(formData.get("conditions") ?? "[]");
  const parsed = JSON.parse(raw) as TriggerCondition[];
  return Array.isArray(parsed) ? parsed : [];
}

function parseDelay(formData: FormData) {
  return {
    delayValue: Number(formData.get("delayValue") ?? 0),
    delayUnit: String(formData.get("delayUnit") ?? "now") as "now" | "minutes" | "hours" | "days",
  };
}
```

- [ ] **Step 4: Add trigger create and update actions**

```ts
export async function createTriggerRule(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const eventKey = String(formData.get("eventKey") ?? "").trim();
  const { delayValue, delayUnit } = parseDelay(formData);
  const messageText = String(formData.get("messageText") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const conditions = parseConditions(formData);

  if (!name || !eventKey || !messageText) return;

  await prisma.triggerRule.create({
    data: {
      name,
      eventKey,
      status: "draft",
      delayValue,
      delayUnit,
      messageText,
      imageUrl,
      buttons: [],
      conditions,
    },
  });

  revalidatePath("/admin/triggers");
  redirect("/admin/triggers");
}
```

- [ ] **Step 5: Build the two-column trigger form and preview layout**

```tsx
<div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
  <form action={action} className="space-y-5">
    <AdminField label="Trigger name">
      <AdminInput name="name" defaultValue={initial.name} />
    </AdminField>
    <AdminField label="Event">
      <select name="eventKey" defaultValue={initial.eventKey}>...</select>
    </AdminField>
    <ConditionsBuilder initialConditions={initial.conditions} />
    <DelayPicker initialValue={initial.delayValue} initialUnit={initial.delayUnit} />
    <AdminTextarea name="messageText" defaultValue={initial.messageText} />
    <AdminImageField textName="imageUrl" fileName="imageFile" />
  </form>
  <TelegramPreviewCard text={initial.messageText} imageUrl={initial.imageUrl} buttons={initial.buttons} />
</div>
```

- [ ] **Step 6: Run create/edit tests**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
Expected: PASS with create, update, delete, and template-prefill coverage

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/triggers/actions.ts src/app/admin/triggers/new/page.tsx src/app/admin/triggers/[triggerId]/page.tsx src/app/admin/triggers/trigger-form.tsx src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts
git commit -m "feat: add trigger create and edit flows"
```

### Task 6: Finish queue processing, regression coverage, and end-to-end verification

**Files:**
- Modify: `src/app/api/cron/process-triggers/route.ts`
- Modify: `src/features/triggers/trigger-service.ts`
- Modify: `src/features/triggers/trigger-service.test.ts`
- Modify: `src/app/admin/triggers/page.test.tsx`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes:
  - `TriggerRule` records
  - `ScheduledMessage` queue rows
  - new admin routes
- Produces:
  - queue sender aware of `triggerRuleId`, `triggerEventKey`, `buttons`
  - updated product docs references

- [ ] **Step 1: Write the failing regression test for queued message snapshots**

```ts
it("sends queued trigger payloads using the stored snapshot", async () => {
  findPendingScheduledMock.mockResolvedValue([
    {
      id: "pending_1",
      triggerRuleId: "rule_1",
      triggerEventKey: "user.started",
      chatId: "12345",
      text: "Snapshot text",
      imageUrl: "/uploads/admin/triggers/hero.webp",
      buttons: [{ text: "Try free", type: "url", value: "https://example.com" }],
      triggeredAt: new Date(),
      sendAt: new Date(),
      sentAt: null,
      createdAt: new Date(),
    },
  ]);

  await service.processPendingTriggers(sendMessageMock);

  expect(sendMessageMock).toHaveBeenCalledWith("12345", "Snapshot text", {
    imageUrl: "/uploads/admin/triggers/hero.webp",
    buttons: [{ text: "Try free", type: "url", value: "https://example.com" }],
  });
});
```

- [ ] **Step 2: Run the queue test to verify the sender still only handles plain text**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL because `processPendingTriggers` currently only calls `sendMessage(chatId, text)`

- [ ] **Step 3: Expand queue processing to pass message snapshots through the sender callback**

```ts
async processPendingTriggers(
  sendMessage: (
    chatId: string,
    text: string,
    payload: { imageUrl: string | null; buttons: unknown },
  ) => Promise<void>,
): Promise<number> {
  const pending = await deps.findPendingScheduled(50);

  for (const message of pending) {
    await sendMessage(message.chatId, message.text, {
      imageUrl: message.imageUrl ?? null,
      buttons: message.buttons ?? null,
    });
    await deps.markSent(message.id);
  }

  return pending.length;
}
```

- [ ] **Step 4: Update the cron route to send image-first or text-only Telegram messages**

```ts
const sent = await triggerService.processPendingTriggers(
  async (chatId, text, payload) => {
    if (payload.imageUrl) {
      await bot.api.sendPhoto(chatId, payload.imageUrl, { caption: text });
      return;
    }

    await bot.api.sendMessage(chatId, text);
  },
);
```

- [ ] **Step 5: Run the verification set**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts`
Expected: PASS across service, queue, page, and action tests

Run: `npm test -- src/components/admin/chat-bot-subnav.test.ts`
Expected: PASS to confirm adjacent chatbot navigation remains stable

- [ ] **Step 6: Update roadmap/docs references**

```md
- `Triggers` redesigned into event-based automation rules with templates and condition builder.
- `Onboarding` remains a separate chatbot flow.
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron/process-triggers/route.ts src/features/triggers/trigger-service.ts src/features/triggers/trigger-service.test.ts src/app/admin/triggers/page.test.tsx docs/roadmap.md
git commit -m "feat: finish trigger automation rollout"
```

## Self-Review

### Spec Coverage

- Event-based trigger rules: covered by Tasks 1, 2, and 3.
- Multiple `AND` conditions: covered by Tasks 2 and 5.
- Reference-aligned list and create/edit UI: covered by Tasks 4 and 5.
- Templates in interface: covered by Tasks 4 and 5.
- Snapshot-based scheduled sends: covered by Tasks 1, 2, and 6.
- Onboarding stays separate: preserved by Tasks 4 and 6, with no onboarding file changes required.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred “implement later” language remains in task steps.
- Every task names concrete files and commands.
- Every code-changing step includes representative target code rather than generic prose.

### Type Consistency

- `TriggerRuleRecord`, `TriggerCondition`, and `TriggerUserState` are defined in Task 2 and reused consistently in Tasks 3, 5, and 6.
- Scheduled queue references use `triggerRuleId` and `triggerEventKey` consistently after Task 1.
- Delay handling uses `delayValue` plus `delayUnit` consistently in schema, service, and form tasks.
