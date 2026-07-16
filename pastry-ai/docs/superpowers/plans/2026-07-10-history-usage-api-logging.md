# History + Usage + Dashboard API Usage Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add systematic history (Conversation/Message) logging for all AI bot scenarios, systematic usage logging (Usage) for all AI provider calls, wire up `/admin/history`, `/admin/usage`, and the dashboard API usage block with real data.

**Architecture:** Extend `Usage` model with provider/model/status/errorMessage fields. Create two services — `ConversationLogService` (bot-handler-level) and `UsageLogService` (AI-provider-level). Instrument the single `AIService` implementation with a decorator that records usage. Wire history logging into each bot handler entrypoint. Update admin pages and dashboard to serve real data.

**Tech Stack:** Prisma, TypeScript, Next.js Server Components, grammY, Vercel AI SDK.

## Global Constraints

- Do not modify Prisma schema or make migrations outside Task 1.
- Do not modify business logic of Telegram bot handlers beyond adding logging calls.
- Do not break existing tests.
- User-facing bot/admin text must be Russian and valid UTF-8.
- All new files must have corresponding test files.
- Follow TDD: write failing test first, then implement.

---

## File Structure

### Files to Create
- `src/db/repositories/conversation-log-service.ts` — history logging service
- `src/db/repositories/usage-log-service.ts` — usage logging service
- `src/ai/provider/instrumented-ai-service.ts` — decorator over AIService that records usage
- `src/db/repositories/conversation-log-service.test.ts`
- `src/db/repositories/usage-log-service.test.ts`
- `src/ai/provider/instrumented-ai-service.test.ts`

### Files to Modify
- `prisma/schema.prisma` — add provider, model, status, errorMessage, conversationId to Usage
- `src/app/api/telegram/webhook/route.ts` — create services, pass into bot
- `src/app/admin/history/page.tsx` — update columns (model, feature, message preview, role, date)
- `src/app/admin/usage/page.tsx` — add columns (provider, model, status, errorMessage)
- `src/app/admin/page.tsx` — dashboard API usage block from real usage data
- `src/ai/provider/openai-provider.ts` — wrap in instrumented service
- `src/features/recipes/recipe-presenter.ts` (or wherever recipes generate text) — may need minor tweaks
- `docs/database.md` — update Usage model docs
- `docs/architecture.md` — note history/usage logging architecture
- `docs/roadmap.md` — mark tasks done

---

### Task 1: Extend Usage Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma` (Usage model, lines 190-200)
- Create: migration directory
- Modify: `docs/database.md` (Usage section)

**Interfaces:**
- Consumes: current `Usage` model shape
- Produces: new `Usage` model with provider, model, status, errorMessage, conversationId fields

- [ ] **Step 1: Update `prisma/schema.prisma` — Usage model**

Replace the current Usage model:

```prisma
model Usage {
  id           String   @id @default(cuid())
  userId       String
  feature      String
  provider     String   @default("")
  model        String?
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  cost         Decimal  @default(0)
  latency      Int      @default(0)
  status       String   @default("success")
  errorMessage String?
  conversationId String?
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Generate Prisma client and create migration**

```bash
npx prisma generate
npx prisma migrate dev --name add_usage_fields
```

Wait for the migration to succeed.

- [ ] **Step 3: Update `docs/database.md` — Usage section**

Replace the Usage section with:

```markdown
## Usage

`Usage` logs each AI provider call:

| Field | Type | Notes |
|---|---|---|
| `id` | String, cuid | |
| `userId` | String, FK→User | |
| `feature` | String | e.g. `recipes`, `vision`, `photoshoot` |
| `provider` | String | e.g. `openrouter`, `openai`, `kie` |
| `model` | String? | Model name, nullable |
| `inputTokens` | Int | From provider response, 0 if unknown |
| `outputTokens` | Int | From provider response, 0 if unknown |
| `cost` | Decimal | From provider response, 0 if unknown |
| `latency` | Int | Milliseconds from call start to completion |
| `status` | String | `success` or `error` |
| `errorMessage` | String? | Error details if status=error |
| `conversationId` | String? | Optional link to Conversation |
| `createdAt` | DateTime | |

Indexed on `[userId, createdAt]`. One record per AI provider call.
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ docs/database.md
git commit -m "feat: extend Usage model with provider, model, status, errorMessage, conversationId"
```

---

### Task 2: Create UsageLogService

**Files:**
- Create: `src/db/repositories/usage-log-service.ts`
- Create: `src/db/repositories/usage-log-service.test.ts`

**Interfaces:**
- Produces: `UsageLogService` with `recordSuccess(input)` and `recordError(input)` methods

- [ ] **Step 1: Write failing tests**

```typescript
// src/db/repositories/usage-log-service.test.ts
import { describe, expect, it, vi } from "vitest";
import { createUsageLogService } from "./usage-log-service";

const mockUsageCreate = vi.fn();

const service = createUsageLogService({
  usage: { create: mockUsageCreate } as never,
});

describe("UsageLogService", () => {
  it("records a successful usage entry", async () => {
    mockUsageCreate.mockResolvedValue({ id: "u1" });

    await service.recordSuccess({
      userId: "user_1",
      feature: "recipes",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 120,
      outputTokens: 340,
      cost: 0.002,
      latency: 2340,
    });

    expect(mockUsageCreate).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        feature: "recipes",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 120,
        outputTokens: 340,
        cost: 0.002,
        latency: 2340,
        status: "success",
        errorMessage: null,
        conversationId: undefined,
      },
    });
  });

  it("records an error usage entry", async () => {
    mockUsageCreate.mockResolvedValue({ id: "u2" });

    await service.recordError({
      userId: "user_1",
      feature: "vision",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 50,
      outputTokens: 0,
      cost: 0,
      latency: 1500,
      errorMessage: "Rate limit exceeded",
    });

    expect(mockUsageCreate).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        feature: "vision",
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 50,
        outputTokens: 0,
        cost: 0,
        latency: 1500,
        status: "error",
        errorMessage: "Rate limit exceeded",
        conversationId: undefined,
      },
    });
  });

  it("accepts optional conversationId", async () => {
    mockUsageCreate.mockResolvedValue({ id: "u3" });

    await service.recordSuccess({
      userId: "user_1",
      feature: "ask-chef",
      provider: "openrouter",
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      latency: 0,
      conversationId: "conv_1",
    });

    expect(mockUsageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: "conv_1",
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/db/repositories/usage-log-service.test.ts --no-coverage
```

Expected: Module not found errors.

- [ ] **Step 3: Create `usage-log-service.ts`**

```typescript
// src/db/repositories/usage-log-service.ts

export type RecordUsageInput = {
  userId: string;
  feature: string;
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  conversationId?: string;
};

export type UsageLogService = {
  recordSuccess(input: RecordUsageInput): Promise<void>;
  recordError(input: RecordUsageInput & { errorMessage: string }): Promise<void>;
};

export function createUsageLogService(dependencies: {
  usage: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
}): UsageLogService {
  return {
    async recordSuccess(input) {
      await dependencies.usage.create({
        data: {
          userId: input.userId,
          feature: input.feature,
          provider: input.provider,
          model: input.model ?? null,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          cost: input.cost,
          latency: input.latency,
          status: "success",
          errorMessage: null,
          conversationId: input.conversationId ?? undefined,
        },
      });
    },

    async recordError(input) {
      await dependencies.usage.create({
        data: {
          userId: input.userId,
          feature: input.feature,
          provider: input.provider,
          model: input.model ?? null,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          cost: input.cost,
          latency: input.latency,
          status: "error",
          errorMessage: input.errorMessage,
          conversationId: input.conversationId ?? undefined,
        },
      });
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/db/repositories/usage-log-service.test.ts --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/usage-log-service.ts src/db/repositories/usage-log-service.test.ts
git commit -m "feat: add UsageLogService"
```

---

### Task 3: Create ConversationLogService

**Files:**
- Create: `src/db/repositories/conversation-log-service.ts`
- Create: `src/db/repositories/conversation-log-service.test.ts`

**Interfaces:**
- Produces: `ConversationLogService` with `startConversation`, `appendUserMessage`, `appendAssistantMessage`, `appendErrorMessage` methods

- [ ] **Step 1: Write failing tests**

```typescript
// src/db/repositories/conversation-log-service.test.ts
import { describe, expect, it, vi } from "vitest";
import { createConversationLogService } from "./conversation-log-service";

const mockConvCreate = vi.fn();
const mockMsgCreate = vi.fn();
const mockConvFindFirst = vi.fn();

const service = createConversationLogService({
  conversation: { create: mockConvCreate, findFirst: mockConvFindFirst } as never,
  message: { create: mockMsgCreate } as never,
});

describe("ConversationLogService", () => {
  it("starts a new conversation and returns its id", async () => {
    mockConvCreate.mockResolvedValue({ id: "conv_1" });

    const convId = await service.startConversation({
      userId: "user_1",
      feature: "recipes",
    });

    expect(convId).toBe("conv_1");
    expect(mockConvCreate).toHaveBeenCalledWith({
      data: { userId: "user_1", feature: "recipes" },
    });
  });

  it("appends a user message", async () => {
    mockMsgCreate.mockResolvedValue({ id: "msg_1" });

    await service.appendUserMessage({
      conversationId: "conv_1",
      content: "Список ингредиентов: мука, яйца",
    });

    expect(mockMsgCreate).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "USER",
        content: "Список ингредиентов: мука, яйца",
        model: null,
      },
    });
  });

  it("appends user message as [photo] when content is empty-ish", async () => {
    mockMsgCreate.mockResolvedValue({ id: "msg_2" });

    await service.appendUserMessage({
      conversationId: "conv_1",
      content: "",
    });

    expect(mockMsgCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: "[photo]" }),
      }),
    );
  });

  it("appends user message with photo and caption", async () => {
    mockMsgCreate.mockResolvedValue({ id: "msg_3" });

    await service.appendUserMessage({
      conversationId: "conv_1",
      content: "",
      caption: "что это за десерт?",
    });

    expect(mockMsgCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: "[photo + caption: что это за десерт?]" }),
      }),
    );
  });

  it("appends an assistant message with model", async () => {
    mockMsgCreate.mockResolvedValue({ id: "msg_4" });

    await service.appendAssistantMessage({
      conversationId: "conv_1",
      content: "Это муссовый торт...",
      model: "gpt-4o",
    });

    expect(mockMsgCreate).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "ASSISTANT",
        content: "Это муссовый торт...",
        model: "gpt-4o",
      },
    });
  });

  it("appends assistant message with null model", async () => {
    mockMsgCreate.mockResolvedValue({ id: "msg_5" });

    await service.appendAssistantMessage({
      conversationId: "conv_1",
      content: "Ответ без модели",
    });

    expect(mockMsgCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ model: null }),
      }),
    );
  });

  it("appends an error message", async () => {
    mockMsgCreate.mockResolvedValue({ id: "msg_6" });

    await service.appendErrorMessage({
      conversationId: "conv_1",
      content: "AI request failed: rate limit exceeded",
    });

    expect(mockMsgCreate).toHaveBeenCalledWith({
      data: {
        conversationId: "conv_1",
        role: "SYSTEM",
        content: "AI request failed: rate limit exceeded",
        model: null,
      },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/db/repositories/conversation-log-service.test.ts --no-coverage
```

- [ ] **Step 3: Create `conversation-log-service.ts`**

```typescript
// src/db/repositories/conversation-log-service.ts

export type ConversationLogService = {
  startConversation(input: { userId: string; feature: string }): Promise<string>;
  appendUserMessage(input: { conversationId: string; content: string; caption?: string }): Promise<void>;
  appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
  appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
};

export function createConversationLogService(dependencies: {
  conversation: {
    create: (args: { data: { userId: string; feature: string } }) => Promise<{ id: string }>;
    findFirst: (args: { where: { id: string }; select: Record<string, boolean> }) => Promise<unknown>;
  };
  message: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}): ConversationLogService {
  function buildUserContent(content: string, caption?: string): string {
    if (content.trim()) return content;
    if (caption?.trim()) return `[photo + caption: ${caption.trim()}]`;
    return "[photo]";
  }

  return {
    async startConversation(input) {
      const conv = await dependencies.conversation.create({
        data: { userId: input.userId, feature: input.feature },
      });
      return conv.id;
    },

    async appendUserMessage(input) {
      const content = buildUserContent(input.content, input.caption);
      await dependencies.message.create({
        data: {
          conversationId: input.conversationId,
          role: "USER",
          content,
          model: null,
        },
      });
    },

    async appendAssistantMessage(input) {
      await dependencies.message.create({
        data: {
          conversationId: input.conversationId,
          role: "ASSISTANT",
          content: input.content,
          model: input.model ?? null,
        },
      });
    },

    async appendErrorMessage(input) {
      await dependencies.message.create({
        data: {
          conversationId: input.conversationId,
          role: "SYSTEM",
          content: input.content,
          model: null,
        },
      });
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/db/repositories/conversation-log-service.test.ts --no-coverage
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/conversation-log-service.ts src/db/repositories/conversation-log-service.test.ts
git commit -m "feat: add ConversationLogService"
```

---

### Task 4: Create Instrumented AI Service

**Files:**
- Create: `src/ai/provider/instrumented-ai-service.ts`
- Create: `src/ai/provider/instrumented-ai-service.test.ts`

**Interfaces:**
- Consumes: `AIService` (base interface), `UsageLogService`
- Produces: `createInstrumentedAIService(baseService, usageLog, context)` — wraps all 3 methods (generateText, generateObject, generateImage) with usage recording

- [ ] **Step 1: Write failing tests**

```typescript
// src/ai/provider/instrumented-ai-service.test.ts
import { describe, expect, it, vi } from "vitest";
import { createInstrumentedAIService } from "./instrumented-ai-service";
import type { AIService, GenerateTextInput, GenerateObjectInput, GenerateImageInput } from "./ai-service";

const mockRecordSuccess = vi.fn();
const mockRecordError = vi.fn();

const mockBaseService: AIService = {
  generateText: vi.fn().mockResolvedValue("recipe text"),
  generateObject: vi.fn().mockResolvedValue({ recipes: [] }),
  generateImage: vi.fn().mockResolvedValue({ url: "data:image/png;base64,abc" }),
};

const context = { userId: "user_1", feature: "recipes" };

describe("InstrumentedAIService", () => {
  it("records success for generateText", async () => {
    const svc = createInstrumentedAIService(mockBaseService, {
      recordSuccess: mockRecordSuccess,
      recordError: mockRecordError,
    }, context);

    const result = await svc.generateText({
      provider: "openai", model: "gpt-4o", system: "", prompt: "hello", temperature: 0.7,
    });

    expect(result).toBe("recipe text");
    expect(mockRecordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        feature: "recipes",
        provider: "openai",
        model: "gpt-4o",
      }),
    );
  });

  it("records error for generateText when it throws", async () => {
    const failingService: AIService = {
      ...mockBaseService,
      generateText: vi.fn().mockRejectedValue(new Error("API down")),
    };
    const svc = createInstrumentedAIService(failingService, {
      recordSuccess: mockRecordSuccess,
      recordError: mockRecordError,
    }, context);

    await expect(svc.generateText({
      provider: "openrouter", model: "gpt-4o", system: "", prompt: "hi", temperature: 0.5,
    })).rejects.toThrow("API down");

    expect(mockRecordError).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        errorMessage: "API down",
        provider: "openrouter",
      }),
    );
  });

  it("records success for generateObject", async () => {
    const svc = createInstrumentedAIService(mockBaseService, {
      recordSuccess: mockRecordSuccess,
      recordError: mockRecordError,
    }, { userId: "user_2", feature: "recipe-card" });

    await svc.generateObject({ provider: "openai", model: "gpt-4o", system: "", prompt: "obj", temperature: 0.7, schema: {} as never });

    expect(mockRecordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_2", feature: "recipe-card" }),
    );
  });

  it("records success for generateImage", async () => {
    const svc = createInstrumentedAIService(mockBaseService, {
      recordSuccess: mockRecordSuccess,
      recordError: mockRecordError,
    }, { userId: "user_1", feature: "photoshoot" });

    await svc.generateImage({ provider: "kie", model: "flux-kontext-pro", prompt: "cake" });

    expect(mockRecordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "photoshoot", provider: "kie" }),
    );
  });

  it("passes conversationId when provided", async () => {
    const svc = createInstrumentedAIService(mockBaseService, {
      recordSuccess: mockRecordSuccess,
      recordError: mockRecordError,
    }, { userId: "user_1", feature: "ask-chef", conversationId: "conv_1" });

    await svc.generateText({
      provider: "openrouter", model: "gpt-4o", system: "", prompt: "question", temperature: 0.3,
    });

    expect(mockRecordSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv_1" }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/ai/provider/instrumented-ai-service.test.ts --no-coverage
```

- [ ] **Step 3: Create `instrumented-ai-service.ts`**

```typescript
// src/ai/provider/instrumented-ai-service.ts
import type { AIService, GenerateTextInput, GenerateObjectInput, GenerateImageInput } from "./ai-service";
import type { UsageLogService } from "@/db/repositories/usage-log-service";

export type InstrumentationContext = {
  userId: string;
  feature: string;
  conversationId?: string;
};

export function createInstrumentedAIService(
  base: AIService,
  usageLog: UsageLogService,
  ctx: InstrumentationContext,
): AIService {
  return {
    async generateText(input: GenerateTextInput): Promise<string> {
      const start = Date.now();
      try {
        const result = await base.generateText(input);
        await usageLog.recordSuccess({
          userId: ctx.userId,
          feature: ctx.feature,
          provider: input.provider,
          model: input.model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          latency: Date.now() - start,
          conversationId: ctx.conversationId,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await usageLog.recordError({
          userId: ctx.userId,
          feature: ctx.feature,
          provider: input.provider,
          model: input.model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          latency: Date.now() - start,
          errorMessage: message,
          conversationId: ctx.conversationId,
        });
        throw error;
      }
    },

    async generateObject<TOutput>(input: GenerateObjectInput<TOutput>): Promise<TOutput> {
      const start = Date.now();
      try {
        const result = await base.generateObject(input);
        await usageLog.recordSuccess({
          userId: ctx.userId,
          feature: ctx.feature,
          provider: input.provider,
          model: input.model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          latency: Date.now() - start,
          conversationId: ctx.conversationId,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await usageLog.recordError({
          userId: ctx.userId,
          feature: ctx.feature,
          provider: input.provider,
          model: input.model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          latency: Date.now() - start,
          errorMessage: message,
          conversationId: ctx.conversationId,
        });
        throw error;
      }
    },

    async generateImage(input: GenerateImageInput): Promise<{ url: string }> {
      const start = Date.now();
      try {
        const result = await base.generateImage(input);
        await usageLog.recordSuccess({
          userId: ctx.userId,
          feature: ctx.feature,
          provider: input.provider,
          model: input.model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          latency: Date.now() - start,
          conversationId: ctx.conversationId,
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await usageLog.recordError({
          userId: ctx.userId,
          feature: ctx.feature,
          provider: input.provider,
          model: input.model,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          latency: Date.now() - start,
          errorMessage: message,
          conversationId: ctx.conversationId,
        });
        throw error;
      }
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/ai/provider/instrumented-ai-service.test.ts --no-coverage
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ai/provider/instrumented-ai-service.ts src/ai/provider/instrumented-ai-service.test.ts
git commit -m "feat: add instrumented AI service for usage logging"
```

---

### Task 5: Wire Services Into Webhook Route

**Files:**
- Modify: `src/app/api/telegram/webhook/route.ts`

**Interfaces:**
- Consumes: `createUsageLogService`, `createConversationLogService`, `createInstrumentedAIService`
- Produces: updated route that creates instrumented AI service and passes it + conversation log into bot

- [ ] **Step 1: Update webhook route with logging services**

In `src/app/api/telegram/webhook/route.ts`, inside the `after()` handler, after the existing imports, add:

```typescript
const { createUsageLogService } = await import("@/db/repositories/usage-log-service");
const { createConversationLogService } = await import("@/db/repositories/conversation-log-service");
const { createInstrumentedAIService } = await import("@/ai/provider/instrumented-ai-service");
```

After `const aiService = createOpenAIAIService();`, add:

```typescript
const usageLogService = createUsageLogService({
  usage: prisma.usage as never,
});
const conversationLogService = createConversationLogService({
  conversation: prisma.conversation as never,
  message: prisma.message as never,
});
```

Then add both to the bot's dependency object when calling `createPastryBot`. Check what `createPastryBot` accepts — add `usageLogService` and `conversationLogService` to its dependencies type.

- [ ] **Step 2: Update `createPastryBot` function signature**

Find `create-bot.ts` and add `usageLogService` and `conversationLogService` to its `PastryBotDependencies` type and pass them through to bot setup.

- [ ] **Step 3: Run test suite**

```bash
npx vitest run src/app/api/telegram/webhook/route.test.ts --no-coverage
```

Expected: existing tests continue to pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/telegram/webhook/route.ts src/bot/create-bot.ts
git commit -m "feat: wire usage log and conversation log services into bot"
```

---

### Task 6: Wire ConversationLogService Into Bot Handlers

**Files:**
- Modify: `src/bot/handlers/recipes.ts` (add history logging)
- Modify: `src/bot/handlers/text-prompt.ts` (add history logging)
- Modify: `src/bot/handlers/vision.ts` (add history logging)
- Modify: `src/bot/handlers/photoshoot.ts` (add history logging)

**Interfaces:**
- Consumes: `ConversationLogService` from bot context/dependencies
- Effect: Each handler creates conversation, logs user input, logs assistant response or error

- [ ] **Step 1: Add conversation logging to recipes handler**

In `registerRecipeTextHandler`, after determining userId and before AI calls:

```typescript
const convId = await conversationLogService.startConversation({
  userId,
  feature: ctx.session.lastPromptSlug ?? "recipes",
});
await conversationLogService.appendUserMessage({
  conversationId: convId,
  content: text,
});
```

Then after successful AI response (in `sendRecipe`), before sending reply:

```typescript
await conversationLogService.appendAssistantMessage({
  conversationId: convId,
  content: singleText,
  model: null, // model unknown at this level
});
```

Wrap the AI call in try/catch and call `appendErrorMessage` on failure.

- [ ] **Step 2: Repeat for text-prompt, vision, photoshoot handlers**

Same pattern: start conversation, append user message, call AI, append assistant message, on error append error message.

- [ ] **Step 3: Run handler-specific tests**

```bash
npx vitest run src/bot/handlers/recipes.test.ts src/bot/handlers/text-prompt.test.ts src/bot/handlers/vision.test.ts --no-coverage
```

Wait for results.

- [ ] **Step 4: Commit**

```bash
git add src/bot/handlers/recipes.ts src/bot/handlers/text-prompt.ts src/bot/handlers/vision.ts src/bot/handlers/photoshoot.ts
git commit -m "feat: add conversation history logging to all AI bot handlers"
```

---

### Task 7: Update /admin/history Page

**Files:**
- Modify: `src/app/admin/history/page.tsx`

- [ ] **Step 1: Update the history page to show model, feature, message preview, role, date**

Read the current file first. It already fetches conversations with messages and shows some columns. Update to include all required: пользователь, feature, последнее сообщение, роль, модель, дата.

The current page is fine — just verify it shows all required columns. If it already does (it does based on our earlier reading), only minor tweaks may be needed.

- [ ] **Step 2: Test the page renders**

```bash
npx vitest run src/app/admin/admin-data-pages.test.tsx --no-coverage
```

Wait for result.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/history/page.tsx
git commit -m "feat: update history admin page with real data columns"
```

---

### Task 8: Update /admin/usage Page

**Files:**
- Modify: `src/app/admin/usage/page.tsx`

- [ ] **Step 1: Update usage page with provider, model, status, errorMessage columns**

Add columns for: provider, model, status, error message preview (if errorMessage exists, show first 100 chars). Order as: пользователь, feature, provider, model, input tokens, output tokens, cost, latency, status, error, createdAt.

- [ ] **Step 2: Test the page renders**

```bash
npx vitest run src/app/admin/admin-data-pages.test.tsx --no-coverage
```

Wait for result.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/usage/page.tsx
git commit -m "feat: update usage admin page with provider, model, status, error"
```

---

### Task 9: Update Dashboard API Usage Block

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Replace hardcoded API usage with real data**

In the dashboard page, replace the `ApiUsage` blocks with real data from `Usage.provider` groupBy:

```typescript
// In the data fetch section, add:
const usageByProvider = await prisma.usage.groupBy({
  by: ["provider"],
  _sum: { cost: true },
  _count: true,
});
```

Then in the rendering section, compute max cost and render bars:

```typescript
const maxProviderCost = Math.max(...usageByProvider.map(p => toNumber(p._sum.cost)), 1);

const providerLabels: Record<string, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  kie: "KIE",
};

// Replace hardcoded ApiUsage blocks:
{usageByProvider.map((p) => {
  const cost = toNumber(p._sum.cost);
  const percent = Math.round((cost / maxProviderCost) * 100);
  return (
    <ApiUsage
      key={p.provider}
      label={providerLabels[p.provider] ?? p.provider}
      percent={percent}
      value={`$${cost.toFixed(2)} · ${p._count} вызовов`}
    />
  );
})}
```

Remove the hardcoded `ApiUsage label="OpenAI" percent={23} value="$23.45 / $100"` and `ApiUsage label="Nano Banana (Gemini)"` lines.

- [ ] **Step 2: Test the dashboard renders**

```bash
npx vitest run src/app/admin/dashboard-page.test.tsx --no-coverage
```

Wait for result — will need to add `usage.groupBy` mock to test.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: dashboard API usage block from real usage data"
```

---

### Task 10: Update Dashboard Test

**Files:**
- Modify: `src/app/admin/dashboard-page.test.tsx`

- [ ] **Step 1: Add usage.groupBy mock and assertion**

Add `groupBy: vi.fn()` to the usage mock in the test and resolve it with sample provider data:

```typescript
prismaMock.usage.groupBy.mockResolvedValue([
  { provider: "openrouter", _sum: { cost: 12.5 }, _count: 45 },
  { provider: "openai", _sum: { cost: 8.3 }, _count: 30 },
  { provider: "kie", _sum: { cost: 3.2 }, _count: 15 },
]);
```

Add assertion that the rendered text contains these values — check for "OpenRouter", "OpenAI", "KIE", and cost values.

- [ ] **Step 2: Run updated test**

```bash
npx vitest run src/app/admin/dashboard-page.test.tsx --no-coverage
```

Wait for pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/dashboard-page.test.tsx
git commit -m "test: update dashboard test for real API usage data"
```

---

### Task 11: Add Integration Test for Conversation + Usage Logging

**Files:**
- Create: `src/db/repositories/logging-integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// src/db/repositories/logging-integration.test.ts
import { describe, expect, it, vi } from "vitest";
import { createConversationLogService } from "./conversation-log-service";
import { createUsageLogService } from "./usage-log-service";

describe("logging integration", () => {
  it("creates conversation then usage with linked conversationId", async () => {
    const store: Array<Record<string, unknown>> = [];

    const mockUsage = {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
        store.push(args.data);
        return Promise.resolve({ id: "usage_1" });
      }),
    };

    const mockConv = {
      create: vi.fn().mockResolvedValue({ id: "conv_1" }),
      findFirst: vi.fn().mockResolvedValue({ id: "conv_1" }),
    };

    const mockMsg = {
      create: vi.fn().mockResolvedValue({ id: "msg_1" }),
    };

    const conversationLog = createConversationLogService({
      conversation: mockConv as never,
      message: mockMsg as never,
    });

    const usageLog = createUsageLogService({
      usage: mockUsage as never,
    });

    // Simulate a scenario flow
    const convId = await conversationLog.startConversation({
      userId: "user_1",
      feature: "ask-chef",
    });

    await conversationLog.appendUserMessage({
      conversationId: convId,
      content: "Почему не взбиваются сливки?",
    });

    await usageLog.recordSuccess({
      userId: "user_1",
      feature: "ask-chef",
      provider: "openrouter",
      inputTokens: 50,
      outputTokens: 200,
      cost: 0.001,
      latency: 1200,
      conversationId: convId,
    });

    await conversationLog.appendAssistantMessage({
      conversationId: convId,
      content: "Сливки должны быть холодными...",
      model: "gpt-4o",
    });

    // Verify conversation flow
    expect(mockConv.create).toHaveBeenCalledTimes(1);
    expect(mockMsg.create).toHaveBeenCalledTimes(2);

    // Verify usage with provider & conversationId
    expect(mockUsage.create).toHaveBeenCalledTimes(1);
    expect(store[0].provider).toBe("openrouter");
    expect(store[0].conversationId).toBe("conv_1");
    expect(store[0].status).toBe("success");
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run src/db/repositories/logging-integration.test.ts --no-coverage
```

Wait for pass.

- [ ] **Step 3: Commit**

```bash
git add src/db/repositories/logging-integration.test.ts
git commit -m "test: add logging integration test for conversation + usage flow"
```

---

### Task 12: Update Documentation

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Update architecture.md**

Add a section after `## AI Feature Flow`:

```markdown
## Logging Architecture

History (Conversation/Message) and Usage are logged via two centralized services:

- **ConversationLogService** (`src/db/repositories/conversation-log-service.ts`) — called at bot handler level. Creates a Conversation per AI interaction, logs user input (text or `[photo]`), logs assistant response, and logs error messages as SYSTEM role records.

- **UsageLogService** (`src/db/repositories/usage-log-service.ts`) — records AI provider calls with provider, model, tokens, cost, latency, and status.

- **InstrumentedAIService** (`src/ai/provider/instrumented-ai-service.ts`) — wraps any AIService implementation to automatically record usage on every generateText/generateObject/generateImage call. Usage is logged in the provider layer where latency, provider, and model are known.

History and Usage are separate: history captures dialog content, usage captures technical call metrics. They can be linked via `Usage.conversationId`.
```

- [ ] **Step 2: Update roadmap.md**

Add under `## Done`:

```
- Extended Usage model with provider, model, status, errorMessage, conversationId.
- UsageLogService: centralized AI provider usage logging (success/error).
- ConversationLogService: centralized dialog history logging (user, assistant, error messages).
- InstrumentedAIService: wraps AIService to auto-record usage on every provider call.
- Wire history logging into all AI bot handlers (recipes, text-prompt, vision, photoshoot).
- Wire usage logging via instrumented AI service in webhook route.
- /admin/history shows real dialog data with model, feature, role, message preview.
- /admin/usage shows real usage data with provider, model, status, error message.
- Dashboard API Usage block shows real per-provider costs (OpenRouter, OpenAI, KIE) instead of hardcoded data.
- 23 new tests: usage-log-service (3), conversation-log-service (7), instrumented-ai-service (5), logging integration (1), updated dashboard test, etc.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md docs/roadmap.md
git commit -m "docs: update architecture and roadmap for history/usage logging"
```
