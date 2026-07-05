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
      tariffPlan: { name: "РњР°СЃС‚РµСЂ" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).resolves.toBeUndefined();
  });

  it("throws when tariff expired", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 10, expiresAt: expiredDate,
      tariffPlan: { name: "РџСЂРѕРјРѕ" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(UserFacingError);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(/РёСЃС‚С‘Рє/);
  });

  it("throws when not enough tokens for batch", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: futureDate,
      tariffPlan: { name: "РџСЂРѕРјРѕ" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(UserFacingError);
    await expect(guard.ensureSufficientTokens("u1", 5)).rejects.toThrow(/РЅРµ С…РІР°С‚Р°РµС‚/);
  });

  it("returns available photo slots (min of requested and remaining)", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: futureDate,
      tariffPlan: { name: "РџСЂРѕРјРѕ" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const slots = await guard.getAvailablePhotoSlots("u1", 4);
    expect(slots).toBe(3);
  });

  it("returns 0 when tariff expired", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 3, expiresAt: expiredDate,
      tariffPlan: { name: "РџСЂРѕРјРѕ" },
    });
    const guard = createTokenGuardService(mockUserTariffRepo as never, mockTokenUsageRepo as never);
    const slots = await guard.getAvailablePhotoSlots("u1", 4);
    expect(slots).toBe(0);
  });

  it("charges tokens and logs usage", async () => {
    mockUserTariffRepo.findByUserId.mockResolvedValue({
      remainingTokens: 5, expiresAt: futureDate,
      tariffPlan: { name: "РџСЂРѕРјРѕ" },
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
          "РЎСЂРѕРє РґРµР№СЃС‚РІРёСЏ РІР°С€РµРіРѕ С‚Р°СЂРёС„Р° РёСЃС‚С‘Рє. Р”РѕСЃС‚СѓРї Рє РіРµРЅРµСЂР°С†РёРё С„РѕС‚Рѕ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ. РљСѓРїРёС‚Рµ РЅРѕРІС‹Р№ С‚Р°СЂРёС„ РІ /menu.",
        );
      }
      if (tariff.remainingTokens < required) {
        throw new UserFacingError(
          `Р”Р»СЏ СЌС‚РѕРіРѕ СЃС†РµРЅР°СЂРёСЏ РЅСѓР¶РЅРѕ ${required} С‚РѕРєРµРЅРѕРІ. РЈ РІР°СЃ РѕСЃС‚Р°Р»РѕСЃСЊ ${tariff.remainingTokens}. РљСѓРїРёС‚Рµ С‚Р°СЂРёС„ СЃ Р±ГіР»СЊС€РёРј РєРѕР»РёС‡РµСЃС‚РІРѕРј С‚РѕРєРµРЅРѕРІ.`,
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

Fix the export type вЂ” actually just export the function. We'll define the type inline where needed.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/features/tariffs/token-guard-service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/features/tariffs/
git commit -m "feat: add TokenGuardService with tariff expiry and token charging"
```

