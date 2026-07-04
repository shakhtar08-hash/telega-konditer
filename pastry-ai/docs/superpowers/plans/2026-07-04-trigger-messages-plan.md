# Trigger Messages (Дожим) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delayed trigger messages that the bot sends N minutes after events (/start, payment).

**Architecture:** Two new Prisma models (TriggerMessage, ScheduledMessage). Cron-triggered API route processes pending messages. Admin CRUD page for managing triggers. Light integration into existing start/payment flows.

**Tech Stack:** Prisma, Next.js API route, grammY, Telegram Bot API

---

## File Structure

```
Create:
  prisma/migrations/          — npx prisma migrate dev generates this
  src/features/triggers/trigger-service.ts     — scheduleTrigger(), processPendingTriggers()
  src/app/api/cron/process-triggers/route.ts   — GET handler for cron
  src/app/admin/triggers/page.tsx              — CRUD for TriggerMessage
  src/features/triggers/trigger-service.test.ts — unit tests

Modify:
  prisma/schema.prisma                         — add TriggerMessage + ScheduledMessage models
  src/app/admin/layout.tsx                     — add "Триггеры" nav link
  src/db/prisma.ts                             — re-export (handled by prisma generate)
  src/lib/env.ts                               — add CRON_SECRET
  src/bot/commands/start.ts                    — call scheduleTrigger("after-start", ...)
  src/app/api/payments/cloudpayments/route.ts  — call scheduleTrigger("after-payment", ...)
  .env.example                                 — add CRON_SECRET
```

---

### Task 1: Prisma Schema + Migration + Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: auto-generated migration
- Test: `npx prisma generate`

- [ ] **Step 1: Add models to schema.prisma**

Add before the closing `}` of the file:

```prisma
model TriggerMessage {
  id           String   @id @default(cuid())
  slug         String   @unique
  title        String
  text         String
  delayMinutes Int
  targetPlans  Json
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model ScheduledMessage {
  id          String    @id @default(cuid())
  triggerSlug String
  chatId      String
  text        String
  sendAt      DateTime
  sentAt      DateTime?
  createdAt   DateTime  @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-trigger-messages
```

- [ ] **Step 3: Run generate**

```bash
npx prisma generate
```

- [ ] **Step 4: Add seed data**

Insert into `prisma/seed.mjs` in the `main` function after existing seeds, before the disconnect:

```javascript
const existingTriggers = await prisma.triggerMessage.count();

if (existingTriggers === 0) {
  await prisma.triggerMessage.createMany({
    data: [
      {
        slug: "after-start",
        title: "После /start",
        text: "Привет! Мы заметили, что вы ещё не попробовали наши рецепты. Специально для вас — скидка 20% на первый месяц подписки! Переходите в меню и выбирайте любой промт.",
        delayMinutes: 15,
        targetPlans: ["FREE"],
        active: true,
      },
      {
        slug: "after-payment",
        title: "После оплаты",
        text: "Спасибо за покупку! 🎉 У вас теперь полный доступ ко всем функциям бота. Попробуйте «Анализ десерта» — отправьте фото десерта и получите полный технологический разбор.",
        delayMinutes: 30,
        targetPlans: ["PRO", "TEAM"],
        active: true,
      },
    ],
  });
}
```

- [ ] **Step 5: Run seed**

```bash
npm run seed
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.mjs prisma/migrations/
git commit -m "feat: add TriggerMessage and ScheduledMessage models + seed"
```

---

### Task 2: Environment Variable

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add CRON_SECRET to env schema**

In `src/lib/env.ts`, add to the `envSchema` object:

```typescript
  CRON_SECRET: z.string().min(1),
```

- [ ] **Step 2: Add to .env.example**

Add line:
```
CRON_SECRET=your-cron-secret-here
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/env.ts .env.example
git commit -m "feat: add CRON_SECRET env var"
```

---

### Task 3: Trigger Service

**Files:**
- Create: `src/features/triggers/trigger-service.ts`
- Test: `src/features/triggers/trigger-service.test.ts`

- [ ] **Step 1: Write the failing test**

`src/features/triggers/trigger-service.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { createTriggerService } from "./trigger-service";

describe("createTriggerService", () => {
  const mockTriggerMessage = {
    id: "1",
    slug: "after-start",
    title: "test",
    text: "Hello!",
    delayMinutes: 15,
    targetPlans: ["FREE"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const findActiveBySlugMock = vi.fn();
  const createScheduledMock = vi.fn();
  const findPendingScheduledMock = vi.fn();
  const markSentMock = vi.fn();
  const findExistingScheduledMock = vi.fn();

  const service = createTriggerService({
    findActiveBySlug: findActiveBySlugMock,
    createScheduled: createScheduledMock,
    findPendingScheduled: findPendingScheduledMock,
    markSent: markSentMock,
    findExistingScheduled: findExistingScheduledMock,
  });

  it("schedules a trigger when plan matches targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "FREE");

    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerSlug: "after-start",
        chatId: "12345",
        text: "Hello!",
      }),
    );
  });

  it("skips scheduling when plan does not match targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);

    await service.scheduleTrigger("after-start", "12345", "PRO");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("skips scheduling when trigger is not found", async () => {
    findActiveBySlugMock.mockResolvedValue(null);

    await service.scheduleTrigger("nonexistent", "12345", "FREE");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("does not create duplicate pending scheduled message", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);
    findExistingScheduledMock.mockResolvedValue({ id: "existing" });

    await service.scheduleTrigger("after-start", "12345", "FREE");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/triggers/trigger-service.test.ts
Expected: FAIL — "createTriggerService is not defined"
```

- [ ] **Step 3: Write minimal implementation**

`src/features/triggers/trigger-service.ts`:

```typescript
export type TriggerMessageRecord = {
  id: string;
  slug: string;
  title: string;
  text: string;
  delayMinutes: number;
  targetPlans: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledMessageRecord = {
  id: string;
  triggerSlug: string;
  chatId: string;
  text: string;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

type Dependencies = {
  findActiveBySlug(slug: string): Promise<TriggerMessageRecord | null>;
  createScheduled(data: {
    triggerSlug: string;
    chatId: string;
    text: string;
    sendAt: Date;
  }): Promise<ScheduledMessageRecord>;
  findExistingScheduled(
    triggerSlug: string,
    chatId: string,
  ): Promise<{ id: string } | null>;
  findPendingScheduled(
    limit: number,
  ): Promise<ScheduledMessageRecord[]>;
  markSent(id: string): Promise<void>;
};

export function createTriggerService(deps: Dependencies) {
  return {
    async scheduleTrigger(
      slug: string,
      chatId: string,
      plan: string,
    ): Promise<void> {
      const trigger = await deps.findActiveBySlug(slug);

      if (!trigger) {
        return;
      }

      const plans = trigger.targetPlans as string[];

      if (!plans.includes(plan)) {
        return;
      }

      const existing = await deps.findExistingScheduled(slug, chatId);

      if (existing) {
        return;
      }

      const sendAt = new Date(Date.now() + trigger.delayMinutes * 60 * 1000);

      await deps.createScheduled({
        chatId,
        sendAt,
        text: trigger.text,
        triggerSlug: slug,
      });
    },

    async processPendingTriggers(
      sendMessage: (chatId: string, text: string) => Promise<void>,
    ): Promise<number> {
      const pending = await deps.findPendingScheduled(50);
      let sentCount = 0;

      for (const message of pending) {
        try {
          await sendMessage(message.chatId, message.text);
          await deps.markSent(message.id);
          sentCount++;
        } catch (error) {
          console.error("Failed to send trigger message", {
            chatId: message.chatId,
            error,
          });
          await deps.markSent(message.id);
        }
      }

      return sentCount;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/triggers/trigger-service.test.ts
Expected: PASS (4 tests)
```

- [ ] **Step 5: Commit**

```bash
git add src/features/triggers/trigger-service.ts src/features/triggers/trigger-service.test.ts
git commit -m "feat: add trigger service"
```

---

### Task 4: Cron API Route

**Files:**
- Create: `src/app/api/cron/process-triggers/route.ts`

- [ ] **Step 1: Write the route**

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

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/process-triggers/route.ts
git commit -m "feat: add cron route for processing trigger messages"
```

---

### Task 5: Admin CRUD Page for Triggers

**Files:**
- Create: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create admin triggers page**

`src/app/admin/triggers/page.tsx`:

```typescript
import { Plus, Save, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { AdminPageHeader } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminTextarea,
  AdminToggle,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function createTriggerMessage(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const delayMinutes = Number(formData.get("delayMinutes"));
  const targetFree = formData.get("targetFree") === "on";
  const targetPro = formData.get("targetPro") === "on";
  const targetTeam = formData.get("targetTeam") === "on";

  if (!slug || !title || !text || Number.isNaN(delayMinutes)) {
    return;
  }

  const targetPlans: string[] = [];
  if (targetFree) targetPlans.push("FREE");
  if (targetPro) targetPlans.push("PRO");
  if (targetTeam) targetPlans.push("TEAM");

  if (targetPlans.length === 0) {
    return;
  }

  await prisma.triggerMessage.create({
    data: {
      slug,
      title,
      text,
      delayMinutes,
      targetPlans,
      active: true,
    },
  });

  revalidatePath("/admin/triggers");
}

export async function updateTriggerMessage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const delayMinutes = Number(formData.get("delayMinutes"));
  const active = formData.get("active") === "on";
  const targetFree = formData.get("targetFree") === "on";
  const targetPro = formData.get("targetPro") === "on";
  const targetTeam = formData.get("targetTeam") === "on";

  if (!id || !title || !text || Number.isNaN(delayMinutes)) {
    return;
  }

  const targetPlans: string[] = [];
  if (targetFree) targetPlans.push("FREE");
  if (targetPro) targetPlans.push("PRO");
  if (targetTeam) targetPlans.push("TEAM");

  if (targetPlans.length === 0) {
    return;
  }

  await prisma.triggerMessage.update({
    data: { title, text, delayMinutes, active, targetPlans },
    where: { id },
  });

  revalidatePath("/admin/triggers");
}

export async function deleteTriggerMessage(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  await prisma.triggerMessage.delete({ where: { id } });
  revalidatePath("/admin/triggers");
}

export default async function AdminTriggersPage() {
  const triggers = await prisma.triggerMessage.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <AdminPageHeader
          description="Автоматические сообщения, которые бот отправляет через заданное время после события."
          title="Триггерные сообщения"
        />
        <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
          Изменения применяются после сохранения формы
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[#223047] text-sm">
        <span className="px-3 py-2 text-[#63718a]">Меню</span>
        <span className="px-3 py-2 text-[#63718a]">Цепочки</span>
        <span className="border-b-2 border-[#7257ff] px-3 py-2 font-medium text-[#d8d2ff]">
          Триггеры
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.7fr]">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <AdminPanel className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#f4f7fb]">Триггеры</h3>
                <p className="mt-1 text-sm text-[#97a4b8]">
                  Правила автоматической отправки сообщений.
                </p>
              </div>
              <span className="rounded-md border border-[#2a3a55] px-2 py-1 text-xs text-[#97a4b8]">
                {triggers.length}
              </span>
            </div>

            <div className="space-y-2">
              {triggers.map((trigger) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                  key={trigger.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f4f7fb]">
                      {trigger.title}
                    </p>
                    <p className="truncate text-xs text-[#97a4b8]">
                      {trigger.slug} · {trigger.delayMinutes} мин ·{" "}
                      {(trigger.targetPlans as string[]).join(", ")}
                    </p>
                  </div>
                  <span className="text-right text-[#7f8da3]">›</span>
                </div>
              ))}
            </div>

            <form action={createTriggerMessage} className="space-y-3 border-t border-[#223047] pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#f4f7fb]">
                <Plus className="size-4 text-[#9c86ff]" />
                Создать триггер
              </div>
              <AdminField label="Slug">
                <AdminInput name="slug" placeholder="after-start" />
              </AdminField>
              <AdminField label="Название">
                <AdminInput name="title" placeholder="После /start" />
              </AdminField>
              <AdminField label="Текст сообщения">
                <AdminTextarea
                  className="min-h-24"
                  name="text"
                  placeholder="Текст, который получит пользователь..."
                />
              </AdminField>
              <AdminField label="Задержка (минуты)">
                <AdminInput
                  defaultValue={15}
                  name="delayMinutes"
                  type="number"
                />
              </AdminField>
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium text-[#f4f7fb]">Тарифы</legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#97a4b8]">
                    <input name="targetFree" type="checkbox" />
                    FREE
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#97a4b8]">
                    <input name="targetPro" type="checkbox" />
                    PRO
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#97a4b8]">
                    <input name="targetTeam" type="checkbox" />
                    TEAM
                  </label>
                </div>
              </fieldset>
              <AdminButton type="submit">Создать триггер</AdminButton>
            </form>
          </AdminPanel>

          <div className="space-y-4">
            {triggers.map((trigger) => {
              const plans = trigger.targetPlans as string[];

              return (
                <form action={updateTriggerMessage} key={`${trigger.id}-edit`}>
                  <AdminPanel className="space-y-4">
                    <input name="id" type="hidden" value={trigger.id} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-[#f4f7fb]">
                          Редактирование
                        </h3>
                        <p className="text-sm text-[#97a4b8]">
                          {trigger.slug}
                        </p>
                      </div>
                      <AdminButton type="submit">
                        <span className="inline-flex items-center gap-2">
                          <Save className="size-4" />
                          Сохранить
                        </span>
                      </AdminButton>
                    </div>

                    <AdminField label="Название">
                      <AdminInput defaultValue={trigger.title} name="title" />
                    </AdminField>
                    <AdminField label="Текст сообщения">
                      <AdminTextarea
                        className="min-h-24"
                        defaultValue={trigger.text}
                        name="text"
                      />
                    </AdminField>
                    <AdminField label="Задержка (минуты)">
                      <AdminInput
                        defaultValue={trigger.delayMinutes}
                        name="delayMinutes"
                        type="number"
                      />
                    </AdminField>
                    <fieldset className="space-y-1">
                      <legend className="text-sm font-medium text-[#f4f7fb]">Тарифы</legend>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-[#97a4b8]">
                          <input
                            defaultChecked={plans.includes("FREE")}
                            name="targetFree"
                            type="checkbox"
                          />
                          FREE
                        </label>
                        <label className="flex items-center gap-2 text-sm text-[#97a4b8]">
                          <input
                            defaultChecked={plans.includes("PRO")}
                            name="targetPro"
                            type="checkbox"
                          />
                          PRO
                        </label>
                        <label className="flex items-center gap-2 text-sm text-[#97a4b8]">
                          <input
                            defaultChecked={plans.includes("TEAM")}
                            name="targetTeam"
                            type="checkbox"
                          />
                          TEAM
                        </label>
                      </div>
                    </fieldset>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <AdminToggle defaultChecked={trigger.active} name="active">
                        Активен
                      </AdminToggle>
                      <button
                        formAction={deleteTriggerMessage}
                        className="inline-flex items-center gap-2 rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                        type="submit"
                      >
                        <Trash2 className="size-4" />
                        Удалить триггер
                      </button>
                    </div>
                  </AdminPanel>
                </form>
              );
            })}
          </div>
        </div>

        <AdminPanel className="space-y-5">
          <div>
            <h3 className="font-semibold text-[#f4f7fb]">Как это работает</h3>
            <p className="mt-1 text-sm leading-6 text-[#97a4b8]">
              Бот отслеживает события (первый запуск, оплата) и через
              заданное количество минут отправляет пользователю сообщение.
            </p>
          </div>
          <div className="space-y-2 text-sm text-[#97a4b8]">
            <p><strong className="text-[#d8d2ff]">Slug</strong> — уникальный идентификатор, связывает событие в коде с правилом.</p>
            <p><strong className="text-[#d8d2ff]">Тарифы</strong> — пользователи каких тарифов получат это сообщение.</p>
            <p><strong className="text-[#d8d2ff]">Задержка</strong> — через сколько минут после события отправить.</p>
            <p>Каждую минуту сервер проверяет, не пора ли отправить сообщения.</p>
          </div>
        </AdminPanel>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add nav link to admin layout**

In `src/app/admin/layout.tsx`, add to `adminSections` array (after chat-bot):

```typescript
  { href: "/admin/triggers", label: "Триггеры" },
```

And add a matching icon import at the top:

```typescript
import { Timer } from "lucide-react";
```

Add `Timer` to `sectionIcons` after `Bot`:

```typescript
  Timer,
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/triggers/page.tsx src/app/admin/layout.tsx
git commit -m "feat: add admin CRUD page for trigger messages"
```

---

### Task 6: Integrate scheduleTrigger into Start Command

**Files:**
- Modify: `src/bot/commands/start.ts`

- [ ] **Step 1: Add trigger integration to sendAccessAwareEntryPoint**

Import at the top of `src/bot/commands/start.ts`:

```typescript
import { createTriggerService } from "@/features/triggers/trigger-service";
import { prisma } from "@/db/prisma";
```

Create the trigger service inline (or at module level):

```typescript
function getTriggerService() {
  return createTriggerService({
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
}
```

Then at the end of `sendAccessAwareEntryPoint`, after the `if (ctx.from)` block but before the function ends, add:

```typescript
    const triggerService = getTriggerService();
    await triggerService.scheduleTrigger(
      "after-start",
      telegramId,
      user.plan,
    );
```

Put it right after `telegramId = user.telegramId;` (line 118 in the current file), inside the same `if (ctx.from)` block.

- [ ] **Step 2: Commit**

```bash
git add src/bot/commands/start.ts
git commit -m "feat: schedule after-start trigger in /start handler"
```

---

### Task 7: Integrate scheduleTrigger into Payment Handler

**Files:**
- Modify: `src/app/api/payments/cloudpayments/route.ts`

- [ ] **Step 1: Add trigger integration after payment success**

Import at top:

```typescript
import { createTriggerService } from "@/features/triggers/trigger-service";
```

Add after the successful `prisma.$transaction` (before the `return`), inside the route handler:

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

- [ ] **Step 2: Commit**

```bash
git add src/app/api/payments/cloudpayments/route.ts
git commit -m "feat: schedule after-payment trigger on successful payment"
```

---

### Task 8: Verify Full Build

**Files:** None

- [ ] **Step 1: Run full verification**

```bash
npm run verify
```

Expected: lint, typecheck, 104+ tests pass, build succeeds.

- [ ] **Step 2: Run migration on local DB**

```bash
npx prisma migrate dev
```

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: fix review issues"
```
