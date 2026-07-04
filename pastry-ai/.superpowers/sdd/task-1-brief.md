# Task 1: Prisma Schema + Migration + Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: auto-generated migration
- Test: `npx prisma generate`

## Context

This is the first task of the Trigger Messages feature. The project uses Prisma 7 with Supabase Postgres. After this task, the database will have `TriggerMessage` and `ScheduledMessage` tables.

## Steps

### Step 1: Add models to schema.prisma

Open `prisma/schema.prisma` and add these two models before the final closing `}`:

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

### Step 2: Run migration

```bash
npx prisma migrate dev --name add-trigger-messages
```

### Step 3: Run generate

```bash
npx prisma generate
```

### Step 4: Add seed data

Insert into `prisma/seed.mjs` in the `main` function after existing seeds (before the `prisma.$disconnect()` call):

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

### Step 5: Run seed

```bash
npm run seed
```

## Verification

- `npx prisma generate` succeeds
- `npm run seed` succeeds
- The `TriggerMessage` and `ScheduledMessage` tables exist in the database