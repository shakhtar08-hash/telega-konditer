### Task 1: Add Generated Recipe Context Persistence

**Files:**
- Modify: `C:\Users\Roof\Documents\РўРµР»РµРіР°\pastry-ai\prisma\schema.prisma`
- Create: `C:\Users\Roof\Documents\РўРµР»РµРіР°\pastry-ai\prisma\migrations\<timestamp>_add_generated_recipe_context\migration.sql`
- Create: `C:\Users\Roof\Documents\РўРµР»РµРіР°\pastry-ai\src\db\repositories\generated-recipe-context-repository.ts`
- Create: `C:\Users\Roof\Documents\РўРµР»РµРіР°\pastry-ai\src\db\repositories\generated-recipe-context-repository.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`
- Produces: `createGeneratedRecipeContextRepository(model)` with:
  - `create(input: { userId: string; recipeText: string; recipeJson?: StructuredRecipe | null; imageUrl?: string | null; source: "create_recipe"; }): Promise<{ id: string; userId: string; recipeText: string; recipeJson: StructuredRecipe | null; imageUrl: string | null; source: string; createdAt: Date }>`
  - `findByIdForUser(id: string, userId: string): Promise<{ id: string; userId: string; recipeText: string; recipeJson: StructuredRecipe | null; imageUrl: string | null; source: string; createdAt: Date } | null>`

- [ ] **Step 1: Write the failing repository test**

```ts
import { describe, expect, it, vi } from "vitest";
import { createGeneratedRecipeContextRepository } from "./generated-recipe-context-repository";

describe("generated recipe context repository", () => {
  it("creates and reads a recipe context for the same user", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "recipe_1",
      userId: "user_1",
      recipeText: "РўРµРєСЃС‚ СЂРµС†РµРїС‚Р°",
      recipeJson: { name: "РўР°СЂС‚", ingredients: [], steps: [], whyFits: "", activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      imageUrl: "https://img.test/tart.png",
      source: "create_recipe",
      createdAt: new Date("2026-07-07T10:00:00.000Z"),
    });
    const findFirst = vi.fn().mockResolvedValue({
      id: "recipe_1",
      userId: "user_1",
      recipeText: "РўРµРєСЃС‚ СЂРµС†РµРїС‚Р°",
      recipeJson: { name: "РўР°СЂС‚", ingredients: [], steps: [], whyFits: "", activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      imageUrl: "https://img.test/tart.png",
      source: "create_recipe",
      createdAt: new Date("2026-07-07T10:00:00.000Z"),
    });

    const repository = createGeneratedRecipeContextRepository({ create, findFirst });

    await repository.create({
      userId: "user_1",
      recipeText: "РўРµРєСЃС‚ СЂРµС†РµРїС‚Р°",
      recipeJson: { name: "РўР°СЂС‚", ingredients: [], steps: [], whyFits: "", activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      imageUrl: "https://img.test/tart.png",
      source: "create_recipe",
    });

    const record = await repository.findByIdForUser("recipe_1", "user_1");

    expect(findFirst).toHaveBeenCalledWith({ where: { id: "recipe_1", userId: "user_1" } });
    expect(record?.imageUrl).toBe("https://img.test/tart.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/repositories/generated-recipe-context-repository.test.ts`
Expected: FAIL with module not found or missing export for `createGeneratedRecipeContextRepository`

- [ ] **Step 3: Write the minimal implementation**

```ts
import type { StructuredRecipe } from "@/ai/schemas/recipe";

type GeneratedRecipeContextModel = {
  create(args: {
    data: {
      userId: string;
      recipeText: string;
      recipeJson?: StructuredRecipe | null;
      imageUrl?: string | null;
      source: string;
    };
  }): Promise<any>;
  findFirst(args: {
    where: { id: string; userId: string };
  }): Promise<any>;
};

export function createGeneratedRecipeContextRepository(
  model: GeneratedRecipeContextModel,
) {
  return {
    create(input: {
      userId: string;
      recipeText: string;
      recipeJson?: StructuredRecipe | null;
      imageUrl?: string | null;
      source: "create_recipe";
    }) {
      return model.create({ data: input });
    },
    findByIdForUser(id: string, userId: string) {
      return model.findFirst({ where: { id, userId } });
    },
  };
}
```

Add Prisma model:

```prisma
model GeneratedRecipeContext {
  id         String   @id @default(cuid())
  userId     String
  recipeText String
  recipeJson Json?
  imageUrl   String?
  source     String
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

- [ ] **Step 4: Run tests and Prisma generate**

Run: `npx vitest run src/db/repositories/generated-recipe-context-repository.test.ts`
Expected: PASS

Run: `npx prisma generate`
Expected: Prisma client generated successfully

- [ ] **Step 5: Add migration SQL**

```sql
CREATE TABLE "GeneratedRecipeContext" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recipeText" TEXT NOT NULL,
  "recipeJson" JSONB,
  "imageUrl" TEXT,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedRecipeContext_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeneratedRecipeContext_userId_createdAt_idx"
ON "GeneratedRecipeContext"("userId", "createdAt");

ALTER TABLE "GeneratedRecipeContext"
ADD CONSTRAINT "GeneratedRecipeContext_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

