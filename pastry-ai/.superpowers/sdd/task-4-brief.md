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
        tariffPlan: { name: "РџСЂРѕРјРѕ" },
      }),
      upsert: vi.fn(),
      update: vi.fn(),
    };
    const repo = createUserTariffRepository(mockDelegate as never);
    const result = await repo.findByUserId("u1");
    expect(result?.tariffPlan.name).toBe("РџСЂРѕРјРѕ");
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

