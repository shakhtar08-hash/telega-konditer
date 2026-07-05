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

