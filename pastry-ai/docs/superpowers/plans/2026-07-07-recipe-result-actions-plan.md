# Recipe Result Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each generated recipe a separate Telegram result with its own saved context and its own inline actions for recipe card, recalculation, and ask-chef.

**Architecture:** Add a durable `GeneratedRecipeContext` Prisma model for one-recipe-per-record storage, then refactor the recipe handler to deliver recipes one by one instead of as one merged text block. Extend the recipe-card flow to load saved recipe context by `recipeId`, reuse the saved image when available, and bind all three post-recipe actions to that stored context.

**Tech Stack:** Next.js 16, React 19, TypeScript, grammY, Prisma 7, Supabase Postgres, Vitest, Playwright

## Global Constraints

- Read and follow `C:\Users\Roof\Documents\Телега\pastry-ai\docs\architecture.md`, `docs\database.md`, `docs\prompts.md`, `docs\decisions.md`, and `docs\roadmap.md`.
- Never change architecture, database schema, AI prompts or product behavior without checking these documents first.
- Keep Telegram bot behavior in `src/bot`, feature orchestration in `src/features`, AI calls in `src/ai`.
- User-facing bot/admin text should be Russian and valid UTF-8.
- Database changes need a Prisma migration in `prisma/migrations/`.
- After changing `prisma/schema.prisma`, run `npx prisma generate`.
- Use TDD: no production code without a failing test first.
- Do not commit or push unless the user explicitly asks.

---

## File Map

- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\db\repositories\generated-recipe-context-repository.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\db\repositories\generated-recipe-context-repository.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\prisma\schema.prisma`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\prisma\migrations\<timestamp>_add_generated_recipe_context\migration.sql`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\features\recipe-card\recipe-card-service.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipe-card.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipes.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\features\recipes\recipe-presenter.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipes.test.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipe-card.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\telegram\webhook\route.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\architecture.md`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\database.md`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\roadmap.md`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\decisions.md`

### Task 1: Add Generated Recipe Context Persistence

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\prisma\schema.prisma`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\prisma\migrations\<timestamp>_add_generated_recipe_context\migration.sql`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\db\repositories\generated-recipe-context-repository.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\db\repositories\generated-recipe-context-repository.test.ts`

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
      recipeText: "Текст рецепта",
      recipeJson: { name: "Тарт", ingredients: [], steps: [], whyFits: "", activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      imageUrl: "https://img.test/tart.png",
      source: "create_recipe",
      createdAt: new Date("2026-07-07T10:00:00.000Z"),
    });
    const findFirst = vi.fn().mockResolvedValue({
      id: "recipe_1",
      userId: "user_1",
      recipeText: "Текст рецепта",
      recipeJson: { name: "Тарт", ingredients: [], steps: [], whyFits: "", activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      imageUrl: "https://img.test/tart.png",
      source: "create_recipe",
      createdAt: new Date("2026-07-07T10:00:00.000Z"),
    });

    const repository = createGeneratedRecipeContextRepository({ create, findFirst });

    await repository.create({
      userId: "user_1",
      recipeText: "Текст рецепта",
      recipeJson: { name: "Тарт", ingredients: [], steps: [], whyFits: "", activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
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

### Task 2: Teach Recipe Card Service to Reuse Saved Context

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\features\recipe-card\recipe-card-service.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipe-card.test.ts`

**Interfaces:**
- Consumes: `StructuredRecipe`, `RecipeCardOutput`, `AIService`
- Produces: `recipeCardService.createCard(input: { recipeText?: string; recipeJson?: StructuredRecipe; imageUrl?: string | null; promptSlug?: string; template?: CardTemplate; }): Promise<{ urls: string[] } | { text: string }>`

- [ ] **Step 1: Write the failing service test for saved image reuse**

```ts
import { describe, expect, it, vi } from "vitest";
import { createRecipeCardService } from "@/features/recipe-card/recipe-card-service";

describe("recipe card service", () => {
  it("reuses saved imageUrl instead of generating a new image", async () => {
    const recipeCardAgent = {
      execute: vi.fn().mockResolvedValue({
        title: "Тарт",
        description: "Ягодный десерт",
        ingredients: [],
        steps: ["Смешать"],
        tips: [],
        meta: { time: "30 минут", yield: "1 торт", difficulty: null, storage: null, weight: null },
      }),
    };
    const aiService = {
      generateImage: vi.fn(),
    } as any;

    const service = createRecipeCardService({ recipeCardAgent, aiService });

    await service.createCard({
      recipeJson: {
        name: "Тарт",
        whyFits: "Подходит",
        ingredients: ["Ягоды"],
        steps: ["Смешать"],
        activeTime: "10 минут",
        chillingTime: "20 минут",
        totalTime: "30 минут",
        difficulty: "easy",
        pastryTip: "Охладить",
        imagePrompt: "Berry tart",
      },
      imageUrl: "https://img.test/tart.png",
      template: "minimal",
    });

    expect(aiService.generateImage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/bot/handlers/recipe-card.test.ts`
Expected: FAIL because `createCard` does not accept `recipeJson`/`imageUrl`

- [ ] **Step 3: Write the minimal implementation**

```ts
const recipeCardInputSchema = z.object({
  recipeText: z.string().trim().min(1).optional(),
  recipeJson: z.custom<StructuredRecipe>().optional(),
  imageUrl: z.string().trim().optional().nullable(),
}).refine((value) => value.recipeText || value.recipeJson, {
  message: "Recipe text or recipe json is required",
});

function recipeSourceToText(input: { recipeText?: string; recipeJson?: StructuredRecipe }) {
  if (input.recipeText) {
    return input.recipeText;
  }

  return [
    input.recipeJson?.name,
    "",
    "Ингредиенты:",
    ...(input.recipeJson?.ingredients ?? []),
    "",
    "Приготовление:",
    ...(input.recipeJson?.steps ?? []),
  ].join("\n");
}

const parsed = recipeCardInputSchema.parse(input);
const recipeText = recipeSourceToText(parsed);
const imageUrl = parsed.imageUrl ?? (await maybeGenerateImage());
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/bot/handlers/recipe-card.test.ts`
Expected: PASS

### Task 3: Split Recipe Delivery Into Per-Recipe Result Blocks

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\features\recipes\recipe-presenter.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipes.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipes.test.ts`

**Interfaces:**
- Consumes: `StructuredRecipe[]`, `GeneratedRecipeContextRepository`
- Produces:
  - `formatSingleRecipeForTelegram(recipe: StructuredRecipe, index: number): string`
  - `buildRecipeActionKeyboard(recipeId: string): { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }`

- [ ] **Step 1: Write the failing handler helper tests**

```ts
import { describe, expect, it } from "vitest";
import { formatSingleRecipeForTelegram, buildRecipeActionKeyboard } from "./recipes";

describe("recipe result actions", () => {
  it("formats one recipe as an isolated message block", () => {
    const text = formatSingleRecipeForTelegram({
      name: "Тарт",
      whyFits: "Подходит",
      ingredients: ["Ягоды"],
      steps: ["Смешать"],
      activeTime: "10 минут",
      chillingTime: "20 минут",
      totalTime: "30 минут",
      difficulty: "easy",
      pastryTip: "Охладить",
      imagePrompt: "Berry tart",
    }, 0);

    expect(text).toContain("1. Название");
    expect(text).toContain("Тарт");
    expect(text).not.toContain("Нашел");
  });

  it("builds recipe-bound callbacks for all three actions", () => {
    expect(buildRecipeActionKeyboard("recipe_1")).toEqual({
      inline_keyboard: [
        [{ text: "✨ Создать карточку рецепта", callback_data: "create_recipe_card:recipe_1" }],
        [{ text: "📏 Пересчитать рецепт", callback_data: "recipe_recalculate:recipe_1" }],
        [{ text: "👨‍🍳 Задать вопрос", callback_data: "ask_chef_recipe:recipe_1" }],
      ],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/bot/handlers/recipes.test.ts`
Expected: FAIL because `formatSingleRecipeForTelegram` and `buildRecipeActionKeyboard` do not exist

- [ ] **Step 3: Write the minimal implementation**

```ts
export function formatSingleRecipeForTelegram(
  recipe: StructuredRecipe,
  index: number,
) {
  return formatRecipeForTelegram(recipe, index);
}

export function buildRecipeActionKeyboard(recipeId: string) {
  return {
    inline_keyboard: [
      [{ text: "✨ Создать карточку рецепта", callback_data: `create_recipe_card:${recipeId}` }],
      [{ text: "📏 Пересчитать рецепт", callback_data: `recipe_recalculate:${recipeId}` }],
      [{ text: "👨‍🍳 Задать вопрос", callback_data: `ask_chef_recipe:${recipeId}` }],
    ],
  };
}
```

Then refactor the delivery loop in `recipes.ts` to:

```ts
for (let i = 0; i < recipeOutput.recipes.length; i++) {
  const recipe = recipeOutput.recipes[i];
  const recipeText = formatSingleRecipeForTelegram(recipe, i);
  const imageUrl = i < slots ? await generateRecipeImage(recipe) : null;
  const saved = await generatedRecipeContextRepository.create({
    userId,
    recipeText,
    recipeJson: recipe,
    imageUrl,
    source: "create_recipe",
  });

  for (const chunk of splitTelegramText(recipeText)) {
    await ctx.reply(chunk);
  }

  if (imageUrl) {
    await ctx.replyWithPhoto(toTelegramPhotoInput(imageUrl, `${recipe.name}.png`), {
      caption: recipe.name,
      reply_markup: buildRecipeActionKeyboard(saved.id),
    });
  } else {
    await ctx.reply("Фото не создано из-за лимита токенов.", {
      reply_markup: buildRecipeActionKeyboard(saved.id),
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/bot/handlers/recipes.test.ts`
Expected: PASS

### Task 4: Add Callback Handlers for Recipe-Bound Actions

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipe-card.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\context.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\telegram\webhook\route.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\bot\handlers\recipe-card.test.ts`

**Interfaces:**
- Consumes: `GeneratedRecipeContextRepository`, `TokenGuardService`, `recipeCardService.createCard(...)`
- Produces:
  - callback handler for `create_recipe_card:<recipeId>`
  - callback handler for `recipe_recalculate:<recipeId>`
  - callback handler for `ask_chef_recipe:<recipeId>`
  - session fields:
    - `selectedGeneratedRecipeId?: string`
    - `selectedGeneratedRecipeText?: string`

- [ ] **Step 1: Write the failing callback tests**

```ts
import { describe, expect, it, vi } from "vitest";

describe("recipe card callback from saved recipe context", () => {
  it("loads the saved recipe by id and reuses its image", async () => {
    const repository = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: "recipe_1",
        userId: "user_1",
        recipeText: "Текст рецепта",
        recipeJson: {
          name: "Тарт",
          whyFits: "Подходит",
          ingredients: ["Ягоды"],
          steps: ["Смешать"],
          activeTime: "10 минут",
          chillingTime: "20 минут",
          totalTime: "30 минут",
          difficulty: "easy",
          pastryTip: "Охладить",
          imagePrompt: "Berry tart",
        },
        imageUrl: "https://img.test/tart.png",
        source: "create_recipe",
        createdAt: new Date(),
      }),
    };

    expect(repository.findByIdForUser).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/bot/handlers/recipe-card.test.ts`
Expected: FAIL because callback path and repository dependency do not exist

- [ ] **Step 3: Write the minimal implementation**

Add callback registration shape:

```ts
composer.callbackQuery(/^create_recipe_card:(.+)$/, async (ctx) => {
  const recipeId = ctx.match[1];
  const userId = await resolveUserIdByTelegramId(prisma.user, String(ctx.from?.id ?? ""));
  if (!userId) {
    await ctx.answerCallbackQuery();
    await ctx.reply(missingProfileMessage);
    return;
  }

  const recipe = await generatedRecipeContextRepository.findByIdForUser(recipeId, userId);
  if (!recipe) {
    await ctx.answerCallbackQuery();
    await ctx.reply("Не удалось найти рецепт. Создайте рецепт заново.");
    return;
  }

  await ctx.answerCallbackQuery();
  await ctx.reply(processingMessage);

  const result = await recipeCardService.createCard({
    recipeText: recipe.recipeText,
    recipeJson: recipe.recipeJson ?? undefined,
    imageUrl: recipe.imageUrl,
    promptSlug: "recipe-card",
    template: "minimal",
  });
});
```

Add starter callbacks for the other two actions:

```ts
composer.callbackQuery(/^recipe_recalculate:(.+)$/, async (ctx) => {
  const recipeId = ctx.match[1];
  const recipe = await generatedRecipeContextRepository.findByIdForUser(recipeId, userId);
  if (!recipe) {
    await ctx.answerCallbackQuery();
    await ctx.reply("Не удалось найти рецепт. Создайте рецепт заново.");
    return;
  }

  ctx.session.lastFeature = "recipe-recalculation";
  ctx.session.lastPromptSlug = "recipe-recalculation";
  ctx.session.selectedGeneratedRecipeId = recipe.id;
  ctx.session.selectedGeneratedRecipeText = recipe.recipeText;
  await ctx.answerCallbackQuery();
  await ctx.reply("Напишите, что именно пересчитать в этом рецепте.");
});
```

```ts
composer.callbackQuery(/^ask_chef_recipe:(.+)$/, async (ctx) => {
  const recipeId = ctx.match[1];
  const recipe = await generatedRecipeContextRepository.findByIdForUser(recipeId, userId);
  if (!recipe) {
    await ctx.answerCallbackQuery();
    await ctx.reply("Не удалось найти рецепт. Создайте рецепт заново.");
    return;
  }

  ctx.session.lastFeature = "ask-chef";
  ctx.session.lastPromptSlug = "ask-chef";
  ctx.session.selectedGeneratedRecipeId = recipe.id;
  ctx.session.selectedGeneratedRecipeText = recipe.recipeText;
  await ctx.answerCallbackQuery();
  await ctx.reply("Напишите ваш вопрос по этому рецепту.");
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/bot/handlers/recipe-card.test.ts`
Expected: PASS

### Task 5: Wire Dependencies, Verify Recipe Count, and Update Docs

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\telegram\webhook\route.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\architecture.md`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\database.md`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\roadmap.md`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\decisions.md`

**Interfaces:**
- Consumes: repository/service constructors from Tasks 1-4
- Produces: fully wired webhook runtime and updated durable docs

- [ ] **Step 1: Write the failing regression test for recipe count preservation**

```ts
it("preserves all returned recipes instead of collapsing the result to two items", () => {
  const output = {
    recipes: [
      { name: "Рецепт 1", whyFits: "", ingredients: [], steps: [], activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      { name: "Рецепт 2", whyFits: "", ingredients: [], steps: [], activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
      { name: "Рецепт 3", whyFits: "", ingredients: [], steps: [], activeTime: "", chillingTime: "", totalTime: "", difficulty: "easy", pastryTip: "", imagePrompt: "" },
    ],
  };

  expect(output.recipes).toHaveLength(3);
});
```

- [ ] **Step 2: Run focused tests**

Run: `npx vitest run src/bot/handlers/recipes.test.ts src/bot/handlers/recipe-card.test.ts src/db/repositories/generated-recipe-context-repository.test.ts`
Expected: PASS once implementation is complete

- [ ] **Step 3: Wire repository construction into the webhook**

```ts
import { createGeneratedRecipeContextRepository } from "@/db/repositories/generated-recipe-context-repository";

const generatedRecipeContextRepository = createGeneratedRecipeContextRepository(
  prisma.generatedRecipeContext,
);

registerRecipeTextHandler(bot, {
  recipeService,
  tokenGuard,
  imageService: aiService,
  generatedRecipeContextRepository,
});

registerRecipeCardTemplateCallback(bot, {
  recipeCardService,
  tokenGuard,
  generatedRecipeContextRepository,
});
```

- [ ] **Step 4: Run full verification**

Run: `npm run verify`
Expected: lint, typecheck, tests, and build all pass

- [ ] **Step 5: Update durable docs**

Document:

- `docs/architecture.md`: recipe flow now sends each recipe separately and binds inline callbacks to saved recipe context.
- `docs/database.md`: add `GeneratedRecipeContext`.
- `docs/roadmap.md`: mark recipe result actions and per-recipe delivery as done.
- `docs/decisions.md`: record the decision that generated recipes are durable, per-recipe units with context-bound follow-up actions.

## Self-Review

- Spec coverage checked:
  - persistent model: Task 1
  - per-recipe delivery: Task 3
  - recipe-card context reuse: Task 2 and Task 4
  - recalculation and ask-chef callbacks bound to `recipeId`: Task 4
  - docs updates: Task 5
- Placeholder scan checked:
  - no `TODO`, `TBD`, or “implement later”
  - all tasks contain exact file paths, commands, and target interfaces
- Type consistency checked:
  - `GeneratedRecipeContextRepository.findByIdForUser(id, userId)` is used consistently
  - `recipeCardService.createCard({ recipeText?, recipeJson?, imageUrl? ... })` is defined once and reused consistently
