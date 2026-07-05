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
        { id: "1", slug: "promo", name: "РџСЂРѕРјРѕ", tokenAmount: 15, durationDays: 3, active: true, sortOrder: 1 },
        { id: "2", slug: "pastry-chef", name: "РљРѕРЅРґРёС‚РµСЂ", tokenAmount: 100, durationDays: 30, active: true, sortOrder: 2 },
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
      findUnique: vi.fn().mockResolvedValue({ id: "1", slug: "promo", name: "РџСЂРѕРјРѕ", tokenAmount: 15, durationDays: 3, active: true, sortOrder: 1 }),
      update: vi.fn(),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.findBySlug("promo");
    expect(result?.name).toBe("РџСЂРѕРјРѕ");
    expect(mockDelegate.findUnique).toHaveBeenCalledWith({ where: { slug: "promo" } });
  });

  it("updates a tariff plan", async () => {
    const mockDelegate = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "1", slug: "promo", name: "РџСЂРѕРјРѕ РѕР±РЅРѕРІР»С‘РЅРЅС‹Р№", tokenAmount: 20, durationDays: 5, active: true, sortOrder: 1 }),
      create: vi.fn(),
    };
    const repo = createTariffPlanRepository(mockDelegate as never);
    const result = await repo.update("1", { name: "РџСЂРѕРјРѕ РѕР±РЅРѕРІР»С‘РЅРЅС‹Р№", tokenAmount: 20, durationDays: 5 });
    expect(result.name).toBe("РџСЂРѕРјРѕ РѕР±РЅРѕРІР»С‘РЅРЅС‹Р№");
    expect(mockDelegate.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { name: "РџСЂРѕРјРѕ РѕР±РЅРѕРІР»С‘РЅРЅС‹Р№", tokenAmount: 20, durationDays: 5 },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/db/repositories/tariff-plan-repository.test.ts
```

Expected: FAIL вЂ” module not found

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

