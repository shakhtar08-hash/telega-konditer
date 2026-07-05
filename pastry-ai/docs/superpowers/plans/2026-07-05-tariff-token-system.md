# Tariff & Token Access System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace FREE/PRO/TEAM with editable tariff plans + token-based image access. Text stays free, each sent image costs 1 token.

**Architecture:** New Prisma models (TariffPlan, UserTariff, TokenUsage) + repositories + TokenGuardService. RecipeAgent returns structured output (text + dishes). Recipe/photoshoot handlers check tokens before generation, charge after successful send. Admin pages for tariff CRUD and user token editing.

**Tech Stack:** Prisma 7 + Supabase Postgres, Next.js 16 App Router, grammY, Vercel AI SDK, OpenRouter (FLUX for images)

## Global Constraints

- All user-facing and admin text must be Russian and valid UTF-8
- `plan` and `credits` on User model become legacy; do not use in new business logic
- Charge tokens ONLY after successful `ctx.replyWithPhoto()` — never before
- Never charge tokens for text or failed image sends
- Recipe: text always sent; photo count = min(dishes.length, remainingTokens, 4)
- Batch photoshoot: check ALL tokens needed before ANY generation starts
- TariffPlan seeds only on empty table (follow `seedEditableCollection` pattern)

---

### Task 1: Prisma Schema — new models + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed-tariffs.mjs`
- Modify: `prisma/seed.mjs`

**Interfaces:**
- Consumes: existing `User` model
- Produces: `TariffPlan`, `UserTariff`, `TokenUsage` models

- [ ] **Step 1: Add new models to schema.prisma**

Add after the `User` model, before `Conversation`:

```prisma
model TariffPlan {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  tokenAmount  Int
  durationDays Int
  active       Boolean  @default(true)
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model UserTariff {
  id              String     @id @default(cuid())
  userId          String     @unique
  tariffPlanId    String
  remainingTokens Int        @default(0)
  startedAt       DateTime   @default(now())
  expiresAt       DateTime
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  tariffPlan      TariffPlan @relation(fields: [tariffPlanId], references: [id])
}

model TokenUsage {
  id          String   @id @default(cuid())
  userId      String
  feature     String
  promptSlug  String?
  imagesSent  Int      @default(0)
  tokensSpent Int      @default(0)
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

Add relations to the `User` model — add these fields after `payments Payment[]`:
```prisma
userTariff UserTariff?
tokenUsage TokenUsage[]
```

- [ ] **Step 2: Generate Prisma client**

Run:
```bash
npx prisma generate
```

- [ ] **Step 3: Create migration**

Run:
```bash
npx prisma migrate dev --name add-tariff-system
```

- [ ] **Step 4: Create seed-tariffs.mjs**

Create `prisma/seed-tariffs.mjs`:
```javascript
import { seedEditableCollection } from "./seed-editable-collection.mjs";

export const tariffPlans = [
  {
    slug: "promo",
    name: "Промо",
    tokenAmount: 15,
    durationDays: 3,
    active: true,
    sortOrder: 1,
  },
  {
    slug: "pastry-chef",
    name: "Кондитер",
    tokenAmount: 100,
    durationDays: 30,
    active: true,
    sortOrder: 2,
  },
  {
    slug: "master",
    name: "Мастер",
    tokenAmount: 200,
    durationDays: 30,
    active: true,
    sortOrder: 3,
  },
  {
    slug: "head-chef",
    name: "Шеф-кондитер",
    tokenAmount: 400,
    durationDays: 30,
    active: true,
    sortOrder: 4,
  },
];

export async function seedTariffPlans(prisma) {
  await seedEditableCollection(prisma.tariffPlan, tariffPlans);
}
```

- [ ] **Step 5: Update seed.mjs**

Add import and seed call in `prisma/seed.mjs`. After the `import` section, add:
```javascript
import { seedTariffPlans } from "./seed-tariffs.mjs";
```

After `await seedEditableCollection(prisma.triggerMessage, ...)` block, add:
```javascript
await seedTariffPlans(prisma);
console.log(`Seeded ${tariffPlans.length} tariff plans.`);
```

Add the import for `tariffPlans` alongside the function import.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ prisma/seed-tariffs.mjs prisma/seed.mjs
git commit -m "feat: add TariffPlan, UserTariff, TokenUsage models and seed"
```

---

### Task 2: Migration script for existing users

**Files:**
- Create: `prisma/migrate-legacy-users.mjs`

**Interfaces:**
- Consumes: `User.credits`, `User.plan`, `Subscription`
- Produces: `UserTariff` rows for existing users

- [ ] **Step 1: Create migration script**

Create `prisma/migrate-legacy-users.mjs`:
```javascript
// Run once to migrate existing users from credits/plan to UserTariff.
// Usage: node prisma/migrate-legacy-users.mjs
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function migrate() {
  const promoPlan = await prisma.tariffPlan.findUnique({ where: { slug: "promo" } });
  if (!promoPlan) {
    console.error("Tariff 'promo' not found. Run seed first.");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    select: { id: true, credits: true },
  });

  let migrated = 0;
  for (const user of users) {
    const existing = await prisma.userTariff.findUnique({ where: { userId: user.id } });
    if (existing) continue;

    const tokens = user.credits > 0 ? user.credits : 15;
    await prisma.userTariff.create({
      data: {
        userId: user.id,
        tariffPlanId: promoPlan.id,
        remainingTokens: tokens,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
    migrated++;
  }

  console.log(`Migrated ${migrated} users to UserTariff.`);
  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add prisma/migrate-legacy-users.mjs
git commit -m "feat: add legacy user migration script for tariffs"
```

---

### Task 3: TariffPlan repository

**Files:**
- Create: `src/db/repositories/tariff-plan-repository.ts`
- Create: `src/db/repositories/tariff-plan-repository.test.ts`

**Interfaces:**
- Produces: `TariffPlanRepository` with `listAll`, `findBySlug`, `findById`, `update`, `create`, `toggleActive`

- [ ] **Step 1: Write the failing tests**

Create `src/db/repositories/tariff-plan-repository.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { createTariffPlanRepository } from "./tariff-plan-repository";

describe("TariffPlanRepository", () => {
  it("lists all tariff plans ordered by sortOrder", async () => {
    const mockDelegate = {
      findMany: vi.fn().mockResolvedValue([
        { id: "1", slug: "promo", name: "Промо", tokenAmount: 15, durationDays: 3, active: true, sortOrder: 1 },
        { id: "2", slug: "pastry-chef", name: "Кондитер", tokenAmount: 100, durationDays: 30, active: true, sortOrder: 2 },
      ]),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.listAll();
    expect(result).toHaveLength(2);
    expect(mockDelegate.findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: "asc" } });
  });

  it("finds by slug", async () => {
    const mockDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ id: "1", slug: "promo", name: "Промо", tokenAmount: 15, durationDays: 3, active: true, sortOrder: 1 }),
      update: vi.fn(),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.findBySlug("promo");
    expect(result?.name).toBe("Промо");
    expect(mockDelegate.findUnique).toHaveBeenCalledWith({ where: { slug: "promo" } });
  });

  it("updates a tariff plan", async () => {
    const mockDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "1", slug: "promo", name: "Промо обновлённый", tokenAmount: 20, durationDays: 5, active: true, sortOrder: 1 }),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.update("1", { name: "Промо обновлённый", tokenAmount: 20, durationDays: 5 });
    expect(result.name).toBe("Промо обновлённый");
    expect(mockDelegate.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { name: "Промо обновлённый", tokenAmount: 20, durationDays: 5 },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/db/repositories/tariff-plan-repository.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/db/repositories/tariff-plan-repository.ts`:
```typescript
export type TariffPlanRecord = {
  id: string;
  slug: string;
  name: string;
  tokenAmount: number;
  durationDays: number;
  active: boolean;
  sortOrder: number;
};

type TariffPlanDelegate = {
  findMany(args: { orderBy: Record<string, string> }): Promise<TariffPlanRecord[]>;
  findUnique(args: { where: { slug?: string; id?: string } }): Promise<TariffPlanRecord | null>;
  update(args: { where: { id: string }; data: Partial<TariffPlanRecord> }): Promise<TariffPlanRecord>;
  create(args: { data: Omit<TariffPlanRecord, "id"> }): Promise<TariffPlanRecord>;
};

export function createTariffPlanRepository(delegate: TariffPlanDelegate) {
  return {
    listAll(): Promise<TariffPlanRecord[]> {
      return delegate.findMany({ orderBy: { sortOrder: "asc" } });
    },
    findBySlug(slug: string): Promise<TariffPlanRecord | null> {
      return delegate.findUnique({ where: { slug } });
    },
    findById(id: string): Promise<TariffPlanRecord | null> {
      return delegate.findUnique({ where: { id } });
    },
    update(id: string, data: Partial<Omit<TariffPlanRecord, "id" | "slug">>): Promise<TariffPlanRecord> {
      return delegate.update({ where: { id }, data });
    },
    create(data: Omit<TariffPlanRecord, "id">): Promise<TariffPlanRecord> {
      return delegate.create({ data });
    },
    async toggleActive(id: string): Promise<TariffPlanRecord> {
      const plan = await delegate.findUnique({ where: { id } });
      if (!plan) throw new Error("Tariff plan not found");
      return delegate.update({ where: { id }, data: { active: !plan.active } });
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/db/repositories/tariff-plan-repository.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/tariff-plan-repository.ts src/db/repositories/tariff-plan-repository.test.ts
git commit -m "feat: add TariffPlanRepository"
```

---

### Task 4: UserTariff repository

**Files:**
- Create: `src/db/repositories/user-tariff-repository.ts`
- Create: `src/db/repositories/user-tariff-repository.test.ts`

**Interfaces:**
- Produces: `UserTariffRepository` with `findByUserId`, `upsert`, `updateRemainingTokens`

- [ ] **Step 1: Write the failing tests**

Create `src/db/repositories/user-tariff-repository.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { createUserTariffRepository } from "./user-tariff-repository";

describe("UserTariffRepository", () => {
  it("finds user tariff by userId", async () => {
    const mockDelegate = {
      findUnique: vi.fn().mockResolvedValue({
        id: "ut1", userId: "u1", tariffPlanId: "tp1",
        remainingTokens: 15, startedAt: new Date(), expiresAt: new Date(),
        tariffPlan: { name: "Промо" },
      }),
      upsert: vi.fn(),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.findByUserId("u1");
    expect(result?.tariffPlan.name).toBe("Промо");
    expect(result?.remainingTokens).toBe(15);
  });

  it("returns null when no tariff found", async () => {
    const mockDelegate = {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.findByUserId("u1");
    expect(result).toBeNull();
  });

  it("upserts a user tariff (full replace)", async () => {
    const mockDelegate = {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({
        id: "ut1", userId: "u1", tariffPlanId: "tp1",
        remainingTokens: 100, startedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000),
      }),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.upsert("u1", { tariffPlanId: "tp1", remainingTokens: 100, expiresAt: new Date(Date.now() + 30 * 86400000) });
    expect(result.remainingTokens).toBe(100);
    expect(mockDelegate.upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      update: expect.objectContaining({ tariffPlanId: "tp1", remainingTokens: 100 }),
      create: expect.objectContaining({ userId: "u1", tariffPlanId: "tp1", remainingTokens: 100 }),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/db/repositories/user-tariff-repository.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/db/repositories/user-tariff-repository.ts`:
```typescript
export type UserTariffRecord = {
  id: string;
  userId: string;
  tariffPlanId: string;
  remainingTokens: number;
  startedAt: Date;
  expiresAt: Date;
  tariffPlan: { name: string; slug: string };
};

type UserTariffDelegate = {
  findUnique(args: {
    where: { userId: string };
    include?: { tariffPlan: { select: { name: boolean; slug: boolean } } };
  }): Promise<UserTariffRecord | null>;
  upsert(args: {
    where: { userId: string };
    update: {
      tariffPlanId: string;
      remainingTokens: number;
      startedAt: Date;
      expiresAt: Date;
    };
    create: {
      userId: string;
      tariffPlanId: string;
      remainingTokens: number;
      startedAt: Date;
      expiresAt: Date;
    };
  }): Promise<UserTariffRecord>;
  update(args: {
    where: { userId: string };
    data: { remainingTokens?: number };
  }): Promise<UserTariffRecord>;
};

export function createUserTariffRepository(delegate: UserTariffDelegate) {
  return {
    findByUserId(userId: string): Promise<UserTariffRecord | null> {
      return delegate.findUnique({
        where: { userId },
        include: { tariffPlan: { select: { name: true, slug: true } } },
      });
    },
    upsert(
      userId: string,
      data: { tariffPlanId: string; remainingTokens: number; expiresAt: Date },
    ): Promise<UserTariffRecord> {
      return delegate.upsert({
        where: { userId },
        update: {
          tariffPlanId: data.tariffPlanId,
          remainingTokens: data.remainingTokens,
          startedAt: new Date(),
          expiresAt: data.expiresAt,
        },
        create: {
          userId,
          tariffPlanId: data.tariffPlanId,
          remainingTokens: data.remainingTokens,
          startedAt: new Date(),
          expiresAt: data.expiresAt,
        },
      });
    },
    updateRemainingTokens(userId: string, remainingTokens: number): Promise<UserTariffRecord> {
      return delegate.update({
        where: { userId },
        data: { remainingTokens },
      });
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/db/repositories/user-tariff-repository.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/user-tariff-repository.ts src/db/repositories/user-tariff-repository.test.ts
git commit -m "feat: add UserTariffRepository"
```

---

### Task 5: TokenUsage repository

**Files:**
- Create: `src/db/repositories/token-usage-repository.ts`
- Create: `src/db/repositories/token-usage-repository.test.ts`

**Interfaces:**
- Produces: `create`

- [ ] **Step 1: Write the failing test**

Create `src/db/repositories/token-usage-repository.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { createTokenUsageRepository } from "./token-usage-repository";

describe("TokenUsageRepository", () => {
  it("creates a token usage record", async () => {
    const mockDelegate = {
      create: vi.fn().mockResolvedValue({
        id: "tu1", userId: "u1", feature: "recipes",
        promptSlug: "recipe-from-ingredients", imagesSent: 2, tokensSpent: 2,
      }),
    };
    const repo = createTokenUsageRepository(mockDelegate as never);
    const result = await repo.create({
      userId: "u1", feature: "recipes", promptSlug: "recipe-from-ingredients",
      imagesSent: 2, tokensSpent: 2,
    });
    expect(result.tokensSpent).toBe(2);
    expect(mockDelegate.create).toHaveBeenCalledWith({
      data: { userId: "u1", feature: "recipes", promptSlug: "recipe-from-ingredients", imagesSent: 2, tokensSpent: 2 },
    });
  });
});
```

- [ ] **Step 2: Run test**

```bash
npm run test -- src/db/repositories/token-usage-repository.test.ts
```

- [ ] **Step 3: Write minimal implementation**

Create `src/db/repositories/token-usage-repository.ts`:
```typescript
type TokenUsageDelegate = {
  create(args: {
    data: {
      userId: string;
      feature: string;
      promptSlug?: string | null;
      imagesSent: number;
      tokensSpent: number;
    };
  }): Promise<{ id: string; tokensSpent: number }>;
};

export function createTokenUsageRepository(delegate: TokenUsageDelegate) {
  return {
    create(data: {
      userId: string;
      feature: string;
      promptSlug?: string | null;
      imagesSent: number;
      tokensSpent: number;
    }) {
      return delegate.create({ data });
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/db/repositories/token-usage-repository.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/token-usage-repository.ts src/db/repositories/token-usage-repository.test.ts
git commit -m "feat: add TokenUsageRepository"
```

---

### Task 6: TokenGuardService

**Files:**
- Create: `src/features/tariffs/token-guard-service.ts`
- Create: `src/features/tariffs/token-guard-service.test.ts`
- Create: `src/features/tariffs/index.ts`

**Interfaces:**
- Produces: `TokenGuardService` with `ensureSufficientTokens`, `getAvailablePhotoSlots`, `chargeTokens`, `getUserTariffState`

- [ ] **Step 1: Write the failing test**

Create `src/features/tariffs/token-guard-service.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { createTokenGuardService } from "./token-guard-service";
import { UserFacingError } from "@/lib/user-facing-error";

describe("TokenGuardService", () => {
  const mockUserTariffRepo = {
    findByUserId: vi.fn(),
    upsert: vi.fn(),
    updateRemainingTokens: vi.fn(),
  };
  const mockTokenUsageRepo = {
    create: vi.fn(),
  };

  const expiredDate = new Date(Date.now() - 86400000);
  const futureDate = new Date(Date.now() + 86400000);

  it("allows sufficient tokens for batch", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 10, expiresAt: futureDate,
      tariffPlan: { name: "Мастер" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).resolves.toBeUndefined();
  });

  it("throws when tariff expired", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 10, expiresAt: expiredDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(UserFacingError);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(/истёк/);
  });

  it("throws when not enough tokens for batch", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: futureDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(UserFacingError);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(/не хватает/);
  });

  it("returns available photo slots (min of requested and remaining)", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: futureDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const slots = await guard.getAvailablePhotoSlots("u1", 4);
    expect(slots).toBe(3);
  });

  it("returns 0 when tariff expired", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: expiredDate,
      tariffPlan: { name: "Промо" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const slots = await guard.getAvailablePhotoSlots("u1", 4);
    expect(slots).toBe(0);
  });

  it("charges tokens and logs usage", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 5, expiresAt: futureDate,
      tariffPlan: { name: "Промо" },
    });
    mockUserTariffRepo.updateRemainingTokens.mockResolvedValue({});
    mockTokenUsageRepo.create.mockResolvedValue({});
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await guard.chargeTokens("u1", "recipes", "recipe-from-ingredients", 2);
    expect(mockUserTariffRepo.updateRemainingTokens).toHaveBeenCalledWith("u1", 3);
    expect(mockTokenUsageRepo.create).toHaveBeenCalledWith({
      userId: "u1", feature: "recipes",
      promptSlug: "recipe-from-ingredients", imagesSent: 2, tokensSpent: 2,
    });
  });

  it("returns null when user has no tariff", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue(null);
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const state = await guard.getUserTariffState("u1");
    expect(state).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/features/tariffs/token-guard-service.test.ts
```

- [ ] **Step 3: Write minimal implementation**

Create `src/features/tariffs/token-guard-service.ts`:
```typescript
import { UserFacingError } from "@/lib/user-facing-error";

type UserTariffRepository = {
  findByUserId(userId: string): Promise<{
    remainingTokens: number;
    expiresAt: Date;
    tariffPlan: { name: string; slug: string };
  } | null>;
  updateRemainingTokens(userId: string, remainingTokens: number): Promise<unknown>;
};

type TokenUsageRepository = {
  create(data: {
    userId: string;
    feature: string;
    promptSlug?: string | null;
    imagesSent: number;
    tokensSpent: number;
  }): Promise<unknown>;
};

export type TariffState = {
  tariffName: string;
  tariffSlug: string;
  remainingTokens: number;
  expiresAt: Date;
  isExpired: boolean;
};

function isExpired(expiresAt: Date) {
  return expiresAt <= new Date();
}

export function createTokenGuardService(
  userTariffRepository: UserTariffRepository,
  tokenUsageRepository: TokenUsageRepository,
) {
  async function getUserTariffState(userId: string): Promise<TariffState | null> {
    const tariff = await userTariffRepository.findByUserId(userId);
    if (!tariff) return null;
    return {
      tariffName: tariff.tariffPlan.name,
      tariffSlug: tariff.tariffPlan.slug,
      remainingTokens: tariff.remainingTokens,
      expiresAt: tariff.expiresAt,
      isExpired: isExpired(tariff.expiresAt),
    };
  }

  return {
    async ensureSufficientTokens(userId: string, required: number): Promise<void> {
      const tariff = await userTariffRepository.findByUserId(userId);
      if (!tariff || isExpired(tariff.expiresAt)) {
        throw new UserFacingError(
          "Срок действия вашего тарифа истёк. Доступ к генерации фото заблокирован. Купите новый тариф в /menu.",
        );
      }
      if (tariff.remainingTokens < required) {
        throw new UserFacingError(
          `Для этого сценария нужно ${required} токенов. У вас осталось ${tariff.remainingTokens}. Купите тариф с бóльшим количеством токенов.`,
        );
      }
    },

    async getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number> {
      const tariff = await userTariffRepository.findByUserId(userId);
      if (!tariff || isExpired(tariff.expiresAt)) return 0;
      return Math.min(maxSlots, tariff.remainingTokens);
    },

    async chargeTokens(
      userId: string,
      feature: string,
      promptSlug: string | null,
      imagesSent: number,
    ): Promise<void> {
      const tariff = await userTariffRepository.findByUserId(userId);
      if (!tariff) return;
      const newBalance = tariff.remainingTokens - imagesSent;
      await userTariffRepository.updateRemainingTokens(userId, Math.max(0, newBalance));
      await tokenUsageRepository.create({
        userId,
        feature,
        promptSlug,
        imagesSent,
        tokensSpent: imagesSent,
      });
    },

    async getUserTariffState(userId: string): Promise<TariffState | null> {
      return getUserTariffState(userId);
    },
  };
}
```

Create `src/features/tariffs/index.ts`:
```typescript
export { createTokenGuardService } from "./token-guard-service";
export type { TokenGuardService } from "./token-guard-service";
```

Fix the export type — actually just export the function. We'll define the type inline where needed.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/features/tariffs/token-guard-service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/features/tariffs/
git commit -m "feat: add TokenGuardService with tariff expiry and token charging"
```

---

### Task 7: Admin tariffs page

**Files:**
- Create: `src/app/admin/tariffs/page.tsx`

**Interfaces:**
- Consumes: `prisma.tariffPlan` directly (server component pattern from `/admin/photo-styles`)
- Produces: CRUD UI for tariff plans

- [ ] **Step 1: Create admin tariffs page**

Create `src/app/admin/tariffs/page.tsx` following the same pattern as `/admin/photo-styles/page.tsx`:

```typescript
import { revalidatePath } from "next/cache";
import {
  AdminPageHeader,
  DataTable,
  formatDate,
  StatusBadge,
} from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminToggle,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function createTariff(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const tokenAmount = Number(formData.get("tokenAmount") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 0);
  const active = formData.get("active") === "on";

  if (!slug || !name || tokenAmount < 1 || durationDays < 1) return;

  const maxPlan = await prisma.tariffPlan.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const sortOrder = (maxPlan?.sortOrder ?? 0) + 1;

  await prisma.tariffPlan.create({
    data: { slug, name, tokenAmount, durationDays, active, sortOrder },
  });

  revalidatePath("/admin/tariffs");
}

export async function updateTariff(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const tokenAmount = Number(formData.get("tokenAmount") ?? 0);
  const durationDays = Number(formData.get("durationDays") ?? 0);
  const active = formData.get("active") === "on";

  if (!id || !name || tokenAmount < 1 || durationDays < 1) return;

  await prisma.tariffPlan.update({
    where: { id },
    data: { name, tokenAmount, durationDays, active },
  });

  revalidatePath("/admin/tariffs");
}

export async function toggleTariff(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const plan = await prisma.tariffPlan.findUnique({ where: { id }, select: { active: true } });
  if (!plan) return;

  await prisma.tariffPlan.update({
    where: { id },
    data: { active: !plan.active },
  });

  revalidatePath("/admin/tariffs");
}

export default async function AdminTariffsPage() {
  const tariffs = await prisma.tariffPlan.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Тарифные планы для доступа к генерации фото. Каждый тариф определяет количество токенов и срок действия."
        title="Тарифы"
      />

      <DataTable
        columns={[
          { header: "Название", cell: (t) => t.name },
          { header: "Токены", cell: (t) => t.tokenAmount },
          { header: "Дней", cell: (t) => t.durationDays },
          { header: "Порядок", cell: (t) => t.sortOrder },
          { header: "Статус", cell: (t) => <StatusBadge active={t.active} /> },
          { header: "Создан", cell: (t) => formatDate(t.createdAt) },
        ]}
        empty="Тарифов пока нет. Создайте первый тариф."
        getKey={(t) => t.id}
        rows={tariffs}
      />

      <form action={createTariff}>
        <AdminPanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Новый тариф</h3>
              <p className="text-sm leading-6 text-[#97a4b8]">
                Создайте новый тарифный план.
              </p>
            </div>
            <AdminButton type="submit">Создать тариф</AdminButton>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label="Slug">
              <AdminInput name="slug" placeholder="premium" />
            </AdminField>
            <AdminField label="Название">
              <AdminInput name="name" placeholder="Премиум" />
            </AdminField>
            <AdminField label="Токены">
              <AdminInput name="tokenAmount" placeholder="500" type="number" />
            </AdminField>
            <AdminField label="Срок (дней)">
              <AdminInput name="durationDays" placeholder="30" type="number" />
            </AdminField>
          </div>

          <AdminToggle defaultChecked name="active">Активен</AdminToggle>
        </AdminPanel>
      </form>

      <div className="grid gap-4">
        {tariffs.map((tariff) => (
          <AdminPanel className="space-y-4" key={`${tariff.id}-editor`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#f4f7fb]">Редактирование тарифа</h3>
                <p className="text-sm text-[#97a4b8]">{tariff.name} ({tariff.slug})</p>
              </div>
              <form action={toggleTariff}>
                <input name="id" type="hidden" value={tariff.id} />
                <AdminButton type="submit" variant={tariff.active ? "danger" : "secondary"}>
                  {tariff.active ? "Отключить" : "Включить"}
                </AdminButton>
              </form>
            </div>

            <form action={updateTariff}>
              <input name="id" type="hidden" value={tariff.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <AdminField label="Название">
                  <AdminInput defaultValue={tariff.name} name="name" />
                </AdminField>
                <AdminField label="Токены">
                  <AdminInput defaultValue={tariff.tokenAmount} name="tokenAmount" type="number" />
                </AdminField>
                <AdminField label="Срок (дней)">
                  <AdminInput defaultValue={tariff.durationDays} name="durationDays" type="number" />
                </AdminField>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <AdminToggle defaultChecked={tariff.active} name="active">Активен</AdminToggle>
                <AdminButton type="submit">Сохранить</AdminButton>
              </div>
            </form>
          </AdminPanel>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add link in admin navigation**

Find the admin layout and add a link to `/admin/tariffs`. Check `src/app/admin/layout.tsx`:

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/tariffs/
git commit -m "feat: add admin tariffs page with CRUD"
```

---

### Task 8: Admin users page extension

**Files:**
- Modify: `src/app/admin/users/page.tsx`

**Interfaces:**
- Consumes: `prisma.userTariff`, `prisma.tariffPlan`
- Produces: user page showing tariff/tokens/expiry + manual token edit

- [ ] **Step 1: Modify users page**

Update `src/app/admin/users/page.tsx`:

1. Add `UserTariff` and `TariffPlan` to the query — modify the `findMany` select to include `userTariff`:
```typescript
const users = await prisma.user.findMany({
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    telegramId: true,
    username: true,
    name: true,
    plan: true,
    credits: true,
    createdAt: true,
    userTariff: {
      select: {
        remainingTokens: true,
        expiresAt: true,
        tariffPlan: { select: { name: true } },
      },
    },
  },
  take: 100,
});
```

2. Add a `updateUserTokens` server action:
```typescript
export async function updateUserTokens(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const tokens = Number(formData.get("tokens") ?? 0);

  if (!id || tokens < 0) return;

  await prisma.userTariff.update({
    where: { userId: id },
    data: { remainingTokens: tokens },
  });

  revalidatePath("/admin/users");
}
```

3. Add columns to the `DataTable` after the `credits` column:
```typescript
{
  header: "Тариф",
  cell: (user) => user.userTariff?.tariffPlan?.name ?? "—",
},
{
  header: "Токены",
  cell: (user) => (
    <form action={updateUserTokens} className="flex items-center gap-2">
      <input name="id" type="hidden" value={user.id} />
      <AdminInput
        className="w-20 py-1 text-center"
        defaultValue={user.userTariff?.remainingTokens ?? 0}
        name="tokens"
        type="number"
        min="0"
      />
      <AdminButton className="py-1" type="submit" variant="secondary">OK</AdminButton>
    </form>
  ),
},
{
  header: "Истекает",
  cell: (user) => user.userTariff?.expiresAt ? formatDate(user.userTariff.expiresAt) : "—",
},
```

Also import `AdminInput` from `@/components/admin/form` (add it to the existing import).

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: extend admin users page with tariff, tokens, and expiry"
```

---

### Task 9: RecipeAgent structured output

**Files:**
- Modify: `src/ai/schemas/recipe.ts`
- Modify: `src/ai/agents/recipe-agent.ts`
- Modify: `src/ai/agents/recipe-agent.test.ts` (if exists)
- Modify: `src/features/recipes/recipe-service.ts`
- Modify: `src/features/recipes/recipe-service.test.ts`
- Modify: `prisma/seed.mjs` (update recipe prompt)

**Interfaces:**
- Consumes: `AIService.generateObject`
- Produces: `RecipeOutput = { text: string; dishes: Array<{ name: string; description: string }> }`

- [ ] **Step 1: Update RecipeOutput schema**

Replace `src/ai/schemas/recipe.ts`:
```typescript
export type RecipeOutput = {
  text: string;
  dishes: Array<{ name: string; description: string }>;
};
```

- [ ] **Step 2: Update RecipeAgent**

Replace `src/ai/agents/recipe-agent.ts`:
```typescript
import { z } from "zod";
import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import type { RecipeOutput } from "../schemas/recipe";

const recipeOutputSchema = z.object({
  text: z.string(),
  dishes: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).min(1).max(4),
});

type PromptLoader = {
  load(feature: "recipes", slug: string): Promise<PromptRecord>;
};

export type RecipeAgentInput = {
  ingredientsText: string;
  promptSlug?: string;
};

export function createRecipeAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: RecipeAgentInput): Promise<RecipeOutput> {
      const prompt = await dependencies.promptLoader.load(
        "recipes",
        input.promptSlug ?? "recipe-from-ingredients",
      );
      const renderedPrompt = prompt.userTemplate.replace(
        "{{ingredients}}",
        input.ingredientsText,
      );

      const recipeSchema = z.object({
        text: z.string(),
        dishes: z.array(z.object({
          name: z.string(),
          description: z.string(),
        })).min(1).max(4),
      });

      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: renderedPrompt,
        provider: prompt.provider,
        model: prompt.model,
        temperature: prompt.temperature,
        schema: recipeSchema,
      });
    },
  };
}
```

- [ ] **Step 3: Update RecipeService**

Replace `src/features/recipes/recipe-service.ts`:
```typescript
import { z } from "zod";
import type { RecipeAgentInput } from "@/ai/agents/recipe-agent";
import type { RecipeOutput } from "@/ai/schemas/recipe";

const recipeInputSchema = z.object({
  ingredientsText: z.string().trim().min(1, "Ingredients are required"),
});

type RecipeAgent = {
  execute(input: RecipeAgentInput): Promise<RecipeOutput>;
};

export function createRecipeService(dependencies: {
  recipeAgent: RecipeAgent;
}) {
  return {
    async createFromIngredients(input: {
      ingredientsText: string;
      promptSlug?: string;
    }): Promise<RecipeOutput> {
      const parsed = recipeInputSchema.parse(input);
      const ingredientsText = parsed.ingredientsText.trim();

      if (!ingredientsText) {
        throw new Error("Ingredients are required");
      }

      return dependencies.recipeAgent.execute({
        ingredientsText,
        promptSlug: input.promptSlug,
      });
    },
  };
}
```

- [ ] **Step 4: Update RecipeService tests**

Replace the test in `src/features/recipes/recipe-service.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { createRecipeService } from "./recipe-service";

const recipeOutput = {
  text: "Нашёл 2 подходящих варианта.",
  dishes: [
    { name: "Тирамису", description: "Классический итальянский десерт с маскарпоне и кофе" },
    { name: "Панна-котта", description: "Нежный сливочный десерт с ванилью" },
  ],
};
const ingredientsText = "Есть:\n- сливки 33%\n- маскарпоне";

describe("RecipeService", () => {
  it("validates ingredients and delegates the full ingredient text to RecipeAgent", async () => {
    const calls: string[] = [];
    const service = createRecipeService({
      recipeAgent: {
        execute: async (input) => {
          calls.push(input.ingredientsText);
          return recipeOutput;
        },
      },
    });

    const result = await service.createFromIngredients({ ingredientsText });
    expect(calls).toEqual([ingredientsText]);
    expect(result).toEqual(recipeOutput);
  });

  it("rejects empty ingredients", async () => {
    const service = createRecipeService({
      recipeAgent: { execute: async () => recipeOutput },
    });

    await expect(
      service.createFromIngredients({ ingredientsText: " " }),
    ).rejects.toThrow("Ingredients are required");
  });
});
```

- [ ] **Step 5: Update recipe prompt in seed**

In `prisma/seed.mjs`, update the recipe prompt to instruct the model to return structured data. Add to the end of the `recipePrompt` string before the closing backtick:

```
\n\nКроме текстового ответа, верни до 4 десертов в формате dishes с полями name (название) и description (подробное описание внешнего вида для генерации фото).`
```

Change the `recipePrompt` to:
```javascript
const recipePrompt = `Ты профессиональный кондитер-технолог.
Отвечай по-русски и предлагай только реальные рецепты из ингредиентов пользователя.

Формат ответа:
1. Название.
2. Почему подходит.
3. Ингредиенты.
4. Пошаговая технология.
5. Время.
6. Сложность.
7. Совет кондитера.

Если продуктов мало, предложи меньше вариантов, но не выдумывай лишнего.

Кроме текстового ответа, верни до 4 десертов в формате dishes с полями name (название) и description (подробное описание внешнего вида десерта для генерации фото).`;
```

Also update the prompt source definitions for best-recipe-search. Add to `prompt-sources/prompts.txt` as the last paragraph of section 1:
```
8. Для каждого рецепта также верни краткое описание внешнего вида десерта.
```

Actually, the prompt sources come from a text file that gets parsed. Let me also update that. Append to the end of section 1 in `prisma/prompt-sources/prompts.txt`:
```

8. Для каждого рецепта также верни краткое описание внешнего вида десерта.
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- src/features/recipes/ src/ai/agents/recipe-agent.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/ai/schemas/recipe.ts src/ai/agents/recipe-agent.ts src/features/recipes/recipe-service.ts src/features/recipes/recipe-service.test.ts prisma/seed.mjs prisma/prompt-sources/prompts.txt
git commit -m "feat: change RecipeAgent to structured output with dishes array"
```

---

### Task 10: Recipe handler — photo generation + token charging

**Files:**
- Modify: `src/bot/handlers/recipes.ts`
- Modify: `src/bot/handlers/recipes.test.ts`
- Modify: `src/bot/create-bot.ts`
- Modify: `src/app/api/telegram/webhook/route.ts`

**Interfaces:**
- Consumes: `TokenGuardService`, `AIService.generateImage`, `RecipeService.createFromIngredients` (now returns `RecipeOutput`)
- Produces: Updated recipe handler that sends text + up to 4 photos + charges tokens

- [ ] **Step 1: Update recipe handler**

In `src/bot/handlers/recipes.ts`:

1. Change the type for `RecipeService`:
```typescript
type RecipeService = {
  createFromIngredients(input: {
    ingredientsText: string;
    promptSlug?: string;
  }): Promise<{
    text: string;
    dishes: Array<{ name: string; description: string }>;
  }>;
};
```

2. Add a `TokenGuardService` type and image generation dependency:
```typescript
type TokenGuardService = {
  getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};
```

3. Update `registerRecipeTextHandler` to accept `tokenGuard` and `aiService`:
```typescript
export function registerRecipeTextHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    recipeService: RecipeService;
    tokenGuard: TokenGuardService;
    aiService: { generateImage(input: { provider: string; prompt: string; model: string }): Promise<{ url: string }> };
  },
): void {
```

4. In `handleIngredientRecipe` and `handleSimpleRecipe`, after sending text, add photo generation:
After the `for (const chunk of ...)` loop that sends text, add:
```typescript
// Send recipe photos
const dishes = recipeText.dishes ?? [];
const slots = await dependencies.tokenGuard.getAvailablePhotoSlots(
  String(ctx.from?.id ?? ""), dishes.length
);
for (let i = 0; i < slots; i++) {
  const dish = dishes[i];
  if (!dish) break;
  try {
    const image = await dependencies.aiService.generateImage({
      provider: "openrouter",
      model: "flux",
      prompt: `Профессиональное фото десерта. ${dish.description}. Аппетитная подача, мягкий свет, ресторанная сервировка.`,
    });
    await ctx.replyWithPhoto(image.url, { caption: `🍰 ${dish.name}` });
    await dependencies.tokenGuard.chargeTokens(
      String(ctx.from?.id ?? ""), "recipes",
      ctx.session.lastPromptSlug ?? null, 1,
    );
  } catch (error) {
    console.error("Failed to generate recipe photo", error);
    await ctx.reply(`Не удалось сгенерировать фото для "${dish.name}".`);
  }
}
if (slots === 0 && dishes.length > 0) {
  await ctx.reply(
    "⚠️ Фото-примеры не приложены — у вас закончились токены. Чтобы получать фото, купите тариф в /menu.",
  );
}
```

The full updated file needs careful integration. The key change is that `recipeText` is no longer a string — it's `{ text, dishes }`.

- [ ] **Step 2: Update webhook route**

In `src/app/api/telegram/webhook/route.ts`:
1. Add imports: `createTokenGuardService`, `createTokenUsageRepository`, `createUserTariffRepository`
2. Create the repositories and `tokenGuard` before creating the bot
3. Pass `tokenGuard` and `aiService` (already available as `aiService`) to the bot

After creating `aiService`, add:
```typescript
const userTariffRepository = createUserTariffRepository(prisma.userTariff);
const tokenUsageRepository = createTokenUsageRepository(prisma.tokenUsage);
const tokenGuard = createTokenGuardService(userTariffRepository, tokenUsageRepository);
```

Add to `createPastryBot` call:
```typescript
tokenGuard,
```

- [ ] **Step 3: Update create-bot.ts**

Update `BotDependencies` and `createPastryBot` to accept and pass `tokenGuard` and `aiService`.

Add to the type:
```typescript
tokenGuard: {
  getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};
aiService: {
  generateImage(input: { provider: string; prompt: string; model: string; size?: string }): Promise<{ url: string }>;
};
```

Pass them to `registerRecipeTextHandler`.

- [ ] **Step 4: Commit**

```bash
git add src/bot/handlers/recipes.ts src/bot/create-bot.ts src/app/api/telegram/webhook/route.ts
git commit -m "feat: add recipe photo generation and token charging"
```

---

### Task 11: Photoshoot handler — token guard

**Files:**
- Modify: `src/bot/handlers/photoshoot.ts`
- Modify: `src/bot/create-bot.ts`
- Modify: `src/app/api/telegram/webhook/route.ts`

**Interfaces:**
- Consumes: `TokenGuardService`
- Produces: Token-checked photoshoot flow

- [ ] **Step 1: Update photoshoot handler**

In `src/bot/handlers/photoshoot.ts`:

1. Add parameter for `tokenGuard`:
```typescript
type TokenGuardService = {
  ensureSufficientTokens(userId: string, required: number): Promise<void>;
  chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
};
```

2. Update `registerPhotoshootPhotoHandler` signature:
```typescript
export function registerPhotoshootPhotoHandler(
  composer: Composer<PastryBotContext>,
  dependencies: {
    botToken: string;
    photoshootService: PhotoshootService;
    tokenGuard: TokenGuardService;
  },
): void {
```

3. After `buildTelegramFileUrl` and before `result = await dependencies.photoshootService...`, add token guard:
```typescript
// Check token sufficiency for all styles
const stylesCount = result?.images?.length ?? 7; // we don't know yet, so check after generation
// Actually, the spec says check before. But we don't know how many styles until the service is called.
// The photoshoot service loads all active styles. We need to check before generation.
// Let's load styles count from the database first.
// Alternative: pass the check into the service.

// Simpler approach: check minimal 1 token, then charge after each send
const userTelegramId = ctx.from ? String(ctx.from.id) : "";
try {
  await dependencies.tokenGuard.ensureSufficientTokens(userTelegramId, 1);
} catch (error) {
  if (error instanceof UserFacingError) {
    await ctx.reply(error.message);
    return;
  }
  throw error;
}
```

Actually, the spec says "if insufficient tokens for ALL → none sent". We need to know the count before generation. The simplest way: check for the full batch count. If results come back with `images` array, we check before sending.

Better approach: move the check after we get `result` but before we start sending:

```typescript
// After result = await dependencies.photoshootService...
try {
  await dependencies.tokenGuard.ensureSufficientTokens(userTelegramId, result.images.length);
} catch (error) {
  if (error instanceof UserFacingError) {
    await ctx.reply(error.message);
    return;
  }
  throw error;
}
```

But then we've already spent the AI generation cost. The spec says check BEFORE. Let me reconsider.

Best approach: the photoshoot service returns images. Check tokens with `ensureSufficientTokens` BEFORE any generation. But the number of images = number of active styles, which we know from the DB.

The photoshoot service already loads active styles. We should check token count before calling the service.

In `registerPhotoshootPhotoHandler`, after getting `imageUrl`, before calling `generateStyledDessertPhotos`:

We need to know how many styles are active. We can get that from prisma:
```typescript
const styleCount = await prisma.photoStyle.count({ where: { active: true } });
```

But importing prisma here is fine (already done in other handlers). Let's add:

```typescript
import { prisma } from "@/db/prisma";

// In the handler, after getting imageUrl:
if (ctx.session.lastFeature === "photoshoot" && ctx.session.lastPromptSlug === "product-photo") {
  const styleCount = await prisma.photoStyle.count({ where: { active: true } });
  const userTelegramId = ctx.from ? String(ctx.from.id) : "";
  try {
    await dependencies.tokenGuard.ensureSufficientTokens(userTelegramId, styleCount);
  } catch (error) {
    if (error instanceof UserFacingError) {
      await ctx.reply(error.message);
      return;
    }
    throw error;
  }
}
```

Then after each successful `ctx.replyWithPhoto()`, charge:
```typescript
await dependencies.tokenGuard.chargeTokens(userTelegramId, "photoshoot", "product-photo", 1);
```

- [ ] **Step 2: Commit**

```bash
git add src/bot/handlers/photoshoot.ts src/bot/create-bot.ts src/app/api/telegram/webhook/route.ts
git commit -m "feat: add token guard to photoshoot handler"
```

---

### Task 12: Single-style photoshoot handler — token guard

**Files:**
- Modify: `src/bot/handlers/single-style-photoshoot.ts`
- Modify: `src/bot/create-bot.ts`

**Interfaces:**
- Consumes: `TokenGuardService`

- [ ] **Step 1: Update single-style handler**

Same pattern as photoshoot but for 1 image. In `src/bot/handlers/single-style-photoshoot.ts`:

1. Add `tokenGuard` parameter to `registerSingleStylePhotoshootHandler`
2. Check `ensureSufficientTokens(userId, 1)` before `generateStyledDessertPhoto`
3. Charge after successful `ctx.replyWithPhoto()`

- [ ] **Step 2: Update create-bot.ts**

Pass `tokenGuard` to both `registerPhotoshootPhotoHandler` and `registerSingleStylePhotoshootHandler`.

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers/single-style-photoshoot.ts src/bot/create-bot.ts
git commit -m "feat: add token guard to single-style photoshoot handler"
```

---

### Task 13: Payment webhook — tariff assignment

**Files:**
- Modify: `src/app/api/payments/cloudpayments/route.ts`
- Modify: `src/features/payments/cloudpayments.ts`

**Interfaces:**
- Consumes: `TariffPlan`, `UserTariff`
- Produces: Full tariff replacement on payment

- [ ] **Step 1: Update payment handling**

In `src/app/api/payments/cloudpayments/route.ts`:

Replace the transaction block that currently creates `subscription` and updates `plan`/`credits`:

```typescript
// Find the tariff plan to assign (default to pastry-chef)
const tariffPlan = await prisma.tariffPlan.findUnique({ where: { slug: "pastry-chef" } });
if (!tariffPlan) {
  return NextResponse.json({ code: 13 });
}

await prisma.$transaction([
  prisma.payment.upsert({
    where: { invoiceId },
    update: {
      providerRawId: formData.get("TransactionId"),
      status: "paid",
    },
    create: {
      amount: cloudPaymentsProduct.amount,
      currency: cloudPaymentsProduct.currency,
      invoiceId,
      provider: "cloudpayments",
      providerRawId: formData.get("TransactionId"),
      status: "paid",
      userId: invoice.userId,
    },
  }),
  prisma.userTariff.upsert({
    where: { userId: invoice.userId },
    update: {
      tariffPlanId: tariffPlan.id,
      remainingTokens: tariffPlan.tokenAmount,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + tariffPlan.durationDays * 24 * 60 * 60 * 1000),
    },
    create: {
      userId: invoice.userId,
      tariffPlanId: tariffPlan.id,
      remainingTokens: tariffPlan.tokenAmount,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + tariffPlan.durationDays * 24 * 60 * 60 * 1000),
    },
  }),
]);
```

Keep the trigger scheduling part but replace `user.plan` with `"PRO"` (or just pass the tariff slug).

- [ ] **Step 2: Commit**

```bash
git add src/app/api/payments/cloudpayments/route.ts
git commit -m "feat: assign tariff plan on payment instead of legacy plan/credits"
```

---

### Task 14: Update access/bot middleware to use tariffs

**Files:**
- Modify: `src/bot/access.ts`
- Modify: `src/bot/middleware/subscription.ts`
- Modify: `src/bot/commands/start.ts`
- Modify: `src/features/users/user-service.ts`

- [ ] **Step 1: Update access.ts**

Add a function to check if user has active tariff (for image access). Keep legacy functions for backward compat but add:
```typescript
export async function userHasTokenAccess(userId: string): Promise<boolean> {
  const { prisma } = await import("@/db/prisma");
  const userTariff = await prisma.userTariff.findUnique({
    where: { userId },
    select: { expiresAt: true, remainingTokens: true },
  });
  return userTariff !== null && userTariff.expiresAt > new Date() && userTariff.remainingTokens > 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bot/access.ts
git commit -m "feat: add userHasTokenAccess function"
```

---

### Task 15: Update docs

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/database.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/decisions.md` (if needed)

- [ ] **Step 1: Update database.md**

Add TariffPlan, UserTariff, TokenUsage model descriptions. Document seed tariffs.

- [ ] **Step 2: Update architecture.md**

Add token guard service. Document new flow for recipes and photoshoot.

- [ ] **Step 3: Update roadmap.md**

Move relevant "Near-term" items to Done. Add tariff system as completed.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: update docs for tariff and token access system"
```

---

### Task 16: Run verification

- [ ] **Step 1: Run full verification**

```bash
npm run verify
```

Expected: lint, typecheck, tests, and build all pass.

- [ ] **Step 2: Fix any issues**

---