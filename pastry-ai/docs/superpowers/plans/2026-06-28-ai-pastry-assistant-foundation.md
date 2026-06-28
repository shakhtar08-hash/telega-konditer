# AI Pastry Assistant Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compile-ready modular foundation for an AI-powered pastry Telegram assistant inside the existing `pastry-ai` Next.js App Router app.

**Architecture:** Use one Next.js App Router application with feature-first modules under `src/`. Routes, pages, and Telegram handlers stay thin; feature services own business behavior; agents call `AIService`; persistence and Supabase clients are isolated behind `src/db` and `src/lib`.

**Tech Stack:** Next.js App Router, TypeScript, Vercel AI SDK, grammY, Prisma ORM, Supabase, Tailwind CSS, shadcn-style UI primitives, Zod, React Hook Form, Vitest.

## Global Constraints

- Work inside `C:\Users\Roof\Documents\Телега\pastry-ai`.
- Do not use the Next.js pages router.
- Use Server Components where appropriate.
- Use Route Handlers for API.
- Follow feature-based architecture.
- Telegram is only one client and must call services, not hold business logic.
- Never call model providers directly from feature code; all model calls go through `AIService`.
- Prompts must not be hardcoded in feature services or Telegram handlers.
- Use Zod validation and strong typing everywhere.
- Do not introduce `any`.
- Keep the first delivery focused on extensible architecture, not complete MVP feature implementation.
- Before writing production code for a behavior, write a failing Vitest test and verify that it fails for the expected reason.

---

## File Structure Map

- `package.json`: add app-local dependencies and verification scripts.
- `vitest.config.ts`: Vitest configuration for TypeScript unit tests.
- `src/app/layout.tsx`: root layout moved from generated `app/`.
- `src/app/page.tsx`: concise product entry page.
- `src/app/api/telegram/webhook/route.ts`: Telegram webhook Route Handler.
- `src/app/admin/**/page.tsx`: admin dashboard and section pages.
- `src/app/admin/layout.tsx`: admin navigation shell.
- `src/app/login/page.tsx`: login route shell for future Supabase Auth.
- `src/ai/provider/ai-service.ts`: provider-facing AI abstraction.
- `src/ai/provider/openai-provider.ts`: Vercel AI SDK provider factory.
- `src/ai/prompts/prompt-loader.ts`: active prompt lookup.
- `src/ai/agents/*.ts`: recipe, vision, photoshoot, carousel agents.
- `src/ai/schemas/*.ts`: Zod schemas for AI outputs.
- `src/features/*/*.ts`: service modules that call agents or repositories.
- `src/bot/create-bot.ts`: grammY bot composition.
- `src/bot/commands/*.ts`: `/start`, `/help`, `/profile`.
- `src/bot/middleware/*.ts`: auth, logger, subscription, errors, session.
- `src/db/prisma.ts`: Prisma client singleton.
- `src/db/repositories/*.ts`: prompt and user repositories.
- `prisma/schema.prisma`: Supabase Postgres schema.
- `src/lib/env.ts`: typed environment validation.
- `src/lib/supabase/*.ts`: browser/server/admin Supabase clients.
- `src/lib/utils.ts`: UI class name helper.
- `src/components/ui/*.tsx`: local shadcn-style primitives.
- `.env.example`: required environment variables.

---

### Task 1: Normalize App Dependencies and Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test`, `npm run lint`, `npm run build`, `npm run typecheck`, `npm run verify`.
- Produces: Vitest environment that can import `@/*` from `src/*`.

- [ ] **Step 1: Write the failing smoke test**

Create `src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("project test harness", () => {
  it("runs TypeScript tests", () => {
    expect("pastry-ai").toBe("pastry-ai");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because Vitest is not configured**

Run:

```bash
npm run test -- src/test/smoke.test.ts
```

Expected: `Missing script: "test"` or equivalent.

- [ ] **Step 3: Update `package.json` with dependencies and scripts**

Replace `package.json` with:

```json
{
  "name": "pastry-ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "verify": "npm run lint && npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "@ai-sdk/openai": "^4.0.2",
    "@hookform/resolvers": "^5.2.2",
    "@prisma/client": "^7.8.0",
    "@radix-ui/react-slot": "^1.2.4",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "ai": "^7.0.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "grammy": "^1.44.0",
    "lucide-react": "^0.561.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.68.0",
    "tailwind-merge": "^3.4.0",
    "zod": "^4.2.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "prisma": "^7.8.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.0.15"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
```

Modify `tsconfig.json` path aliases:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` updates inside `pastry-ai`.

- [ ] **Step 5: Run test and verify it passes**

Run:

```bash
npm run test -- src/test/smoke.test.ts
```

Expected: one passing test.

- [ ] **Step 6: Commit**

```bash
git add pastry-ai/package.json pastry-ai/package-lock.json pastry-ai/tsconfig.json pastry-ai/vitest.config.ts pastry-ai/src/test/smoke.test.ts
git commit -m "chore: add app test harness"
```

---

### Task 2: Move Next App Router Into `src/app`

**Files:**
- Move: `app/layout.tsx` to `src/app/layout.tsx`
- Move: `app/page.tsx` to `src/app/page.tsx`
- Move: `app/globals.css` to `src/app/globals.css`
- Move: `app/favicon.ico` to `src/app/favicon.ico`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: Next.js App Router source in `src/app`.
- Produces: metadata title `AI Pastry Assistant`.

- [ ] **Step 1: Write a failing page metadata test**

Create `src/app/home-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { metadata } from "./layout";

describe("root layout metadata", () => {
  it("names the product", () => {
    expect(metadata.title).toBe("AI Pastry Assistant");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm run test -- src/app/home-content.test.ts
```

Expected: fail because `src/app/layout.tsx` does not exist or title is still `Create Next App`.

- [ ] **Step 3: Move files and update layout**

Move the generated `app` files into `src/app`, then set `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Pastry Assistant",
  description: "Telegram and admin foundation for AI pastry workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Set `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            AI Pastry Assistant
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
            Production foundation for pastry-focused AI workflows.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Telegram bot, admin dashboard, prompt registry, usage tracking,
            and AI agents share one modular service layer.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background" href="/admin">
            Open admin
          </Link>
          <Link className="rounded-md border px-4 py-2 text-sm font-medium" href="/login">
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
```

Update `src/app/globals.css` with design tokens:

```css
@import "tailwindcss";

:root {
  --background: #fbfaf8;
  --foreground: #1d1b18;
  --muted: #f1eee9;
  --muted-foreground: #6d655c;
  --border: #ded7ce;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test -- src/app/home-content.test.ts
```

Expected: pass.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: Next.js builds successfully from `src/app`.

- [ ] **Step 6: Commit**

```bash
git add pastry-ai/app pastry-ai/src/app
git commit -m "chore: move app router into src"
```

---

### Task 3: Add Typed Environment, Prisma Schema, and Repositories

**Files:**
- Create: `.env.example`
- Create: `prisma/schema.prisma`
- Create: `src/lib/env.ts`
- Create: `src/db/prisma.ts`
- Create: `src/db/repositories/prompt-repository.ts`
- Create: `src/db/repositories/user-repository.ts`
- Test: `src/lib/env.test.ts`
- Test: `src/db/repositories/prompt-repository.test.ts`

**Interfaces:**
- Produces: `loadEnv(source?: NodeJS.ProcessEnv): AppEnv`.
- Produces: `PromptRepository.findActiveBySlug(feature: PromptFeature, slug: string): Promise<PromptRecord | null>`.
- Produces: `UserRepository.upsertTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord>`.

- [ ] **Step 1: Write failing env validation test**

Create `src/lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses required application environment", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
    });

    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  it("throws for missing required values", () => {
    expect(() => loadEnv({})).toThrow("Invalid environment");
  });
});
```

- [ ] **Step 2: Verify env test fails**

Run:

```bash
npm run test -- src/lib/env.test.ts
```

Expected: fail because `src/lib/env.ts` does not exist.

- [ ] **Step 3: Implement env validation and `.env.example`**

Create `.env.example`:

```text
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
```

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }

  return parsed.data;
}
```

- [ ] **Step 4: Run env tests**

Run:

```bash
npm run test -- src/lib/env.test.ts
```

Expected: pass.

- [ ] **Step 5: Write failing prompt repository contract test**

Create `src/db/repositories/prompt-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPromptRepository, type PromptRecord } from "./prompt-repository";

describe("PromptRepository", () => {
  it("finds the active prompt by feature and slug", async () => {
    const prompts: PromptRecord[] = [
      {
        id: "prompt_1",
        slug: "recipe-from-ingredients",
        feature: "recipes",
        systemPrompt: "You are a pastry chef.",
        userTemplate: "Ingredients: {{ingredients}}",
        model: "gpt-4o-mini",
        temperature: 0.3,
        active: true,
        version: 1,
      },
    ];

    const repository = createPromptRepository({
      findFirst: async () => prompts[0] ?? null,
    });

    await expect(repository.findActiveBySlug("recipes", "recipe-from-ingredients")).resolves.toEqual(prompts[0]);
  });
});
```

- [ ] **Step 6: Verify prompt repository test fails**

Run:

```bash
npm run test -- src/db/repositories/prompt-repository.test.ts
```

Expected: fail because repository module does not exist.

- [ ] **Step 7: Add Prisma schema and repositories**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Plan {
  FREE
  PRO
  TEAM
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

model User {
  id             String         @id @default(cuid())
  telegramId     String         @unique
  username       String?
  name           String?
  plan           Plan           @default(FREE)
  credits        Int            @default(10)
  createdAt      DateTime       @default(now())
  conversations  Conversation[]
  usage          Usage[]
  subscription   Subscription?
}

model Conversation {
  id        String    @id @default(cuid())
  userId    String
  feature   String
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String
  tokens         Int?
  model          String?
  cost           Decimal?
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

model Prompt {
  id           String   @id @default(cuid())
  slug         String
  feature      String
  systemPrompt String
  userTemplate String
  model        String
  temperature  Float
  active       Boolean  @default(true)
  version      Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([slug, version])
  @@index([feature, slug, active])
}

model PhotoStyle {
  id          String   @id @default(cuid())
  name        String
  description String
  prompt      String
  preview     String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model CarouselTemplate {
  id        String   @id @default(cuid())
  name      String
  prompt    String
  slides    Int
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Usage {
  id           String   @id @default(cuid())
  userId       String
  feature      String
  inputTokens  Int
  outputTokens Int
  cost         Decimal
  latency      Int
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  provider  String
  status    String
  startedAt DateTime @default(now())
  expiresAt DateTime?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Create `src/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Create `src/db/repositories/prompt-repository.ts`:

```ts
export type PromptFeature = "recipes" | "vision" | "photoshoot" | "carousel";

export type PromptRecord = {
  id: string;
  slug: string;
  feature: PromptFeature;
  systemPrompt: string;
  userTemplate: string;
  model: string;
  temperature: number;
  active: boolean;
  version: number;
};

type PromptDelegate = {
  findFirst(args: {
    where: { feature: PromptFeature; slug: string; active: true };
    orderBy: { version: "desc" };
  }): Promise<PromptRecord | null>;
};

export function createPromptRepository(promptDelegate: PromptDelegate) {
  return {
    findActiveBySlug(feature: PromptFeature, slug: string): Promise<PromptRecord | null> {
      return promptDelegate.findFirst({
        where: { feature, slug, active: true },
        orderBy: { version: "desc" },
      });
    },
  };
}
```

Create `src/db/repositories/user-repository.ts`:

```ts
export type UserRecord = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  plan: "FREE" | "PRO" | "TEAM";
  credits: number;
};

export type UpsertTelegramUserInput = {
  telegramId: string;
  username?: string | null;
  name?: string | null;
};

type UserDelegate = {
  upsert(args: {
    where: { telegramId: string };
    update: { username: string | null; name: string | null };
    create: { telegramId: string; username: string | null; name: string | null };
  }): Promise<UserRecord>;
};

export function createUserRepository(userDelegate: UserDelegate) {
  return {
    upsertTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord> {
      const username = input.username ?? null;
      const name = input.name ?? null;

      return userDelegate.upsert({
        where: { telegramId: input.telegramId },
        update: { username, name },
        create: { telegramId: input.telegramId, username, name },
      });
    },
  };
}
```

- [ ] **Step 8: Run repository tests and Prisma generate**

Run:

```bash
npm run test -- src/db/repositories/prompt-repository.test.ts
npm run prisma:generate
```

Expected: test passes and Prisma client generates.

- [ ] **Step 9: Commit**

```bash
git add pastry-ai/.env.example pastry-ai/prisma/schema.prisma pastry-ai/src/lib/env.ts pastry-ai/src/lib/env.test.ts pastry-ai/src/db
git commit -m "feat: add env validation and prisma schema"
```

---

### Task 4: Add AI Service, Prompt Loader, Schemas, and Agents

**Files:**
- Create: `src/ai/provider/ai-service.ts`
- Create: `src/ai/provider/openai-provider.ts`
- Create: `src/ai/prompts/prompt-loader.ts`
- Create: `src/ai/schemas/recipe.ts`
- Create: `src/ai/schemas/vision.ts`
- Create: `src/ai/schemas/photoshoot.ts`
- Create: `src/ai/schemas/carousel.ts`
- Create: `src/ai/agents/recipe-agent.ts`
- Create: `src/ai/agents/vision-agent.ts`
- Create: `src/ai/agents/photoshoot-agent.ts`
- Create: `src/ai/agents/carousel-agent.ts`
- Test: `src/ai/prompts/prompt-loader.test.ts`
- Test: `src/ai/agents/recipe-agent.test.ts`

**Interfaces:**
- Produces: `AIService.generateText`, `AIService.generateObject`, `AIService.generateImage`.
- Produces: `createPromptLoader(repository).load(feature, slug)`.
- Produces: agent `execute(input)` methods.

- [ ] **Step 1: Write failing prompt loader test**

Create `src/ai/prompts/prompt-loader.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPromptLoader } from "./prompt-loader";

describe("createPromptLoader", () => {
  it("loads an active prompt", async () => {
    const loader = createPromptLoader({
      findActiveBySlug: async () => ({
        id: "prompt_1",
        slug: "recipe-from-ingredients",
        feature: "recipes",
        systemPrompt: "System",
        userTemplate: "Ingredients: {{ingredients}}",
        model: "gpt-4o-mini",
        temperature: 0.3,
        active: true,
        version: 1,
      }),
    });

    await expect(loader.load("recipes", "recipe-from-ingredients")).resolves.toMatchObject({
      slug: "recipe-from-ingredients",
    });
  });

  it("throws when a prompt is missing", async () => {
    const loader = createPromptLoader({
      findActiveBySlug: async () => null,
    });

    await expect(loader.load("recipes", "missing")).rejects.toThrow("Prompt not found: recipes/missing");
  });
});
```

- [ ] **Step 2: Verify prompt loader test fails**

Run:

```bash
npm run test -- src/ai/prompts/prompt-loader.test.ts
```

Expected: fail because loader module does not exist.

- [ ] **Step 3: Implement AI service and prompt loader**

Create `src/ai/provider/ai-service.ts`:

```ts
import type { z } from "zod";

export type GenerateTextInput = {
  system: string;
  prompt: string;
  model: string;
  temperature: number;
};

export type GenerateObjectInput<TSchema extends z.ZodType> = GenerateTextInput & {
  schema: TSchema;
};

export type GenerateImageInput = {
  prompt: string;
  model: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
};

export type AIService = {
  generateText(input: GenerateTextInput): Promise<string>;
  generateObject<TSchema extends z.ZodType>(input: GenerateObjectInput<TSchema>): Promise<z.infer<TSchema>>;
  generateImage(input: GenerateImageInput): Promise<{ url: string }>;
};
```

Create `src/ai/provider/openai-provider.ts`:

```ts
import { openai } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage, generateObject, generateText } from "ai";
import type { AIService } from "./ai-service";

export function createOpenAIAIService(): AIService {
  return {
    async generateText(input) {
      const result = await generateText({
        model: openai(input.model),
        system: input.system,
        prompt: input.prompt,
        temperature: input.temperature,
      });

      return result.text;
    },

    async generateObject(input) {
      const result = await generateObject({
        model: openai(input.model),
        system: input.system,
        prompt: input.prompt,
        temperature: input.temperature,
        schema: input.schema,
      });

      return result.object;
    },

    async generateImage(input) {
      const result = await generateImage({
        model: openai.image(input.model),
        prompt: input.prompt,
        size: input.size ?? "1024x1024",
      });

      return { url: result.images[0].url };
    },
  };
}
```

Create `src/ai/prompts/prompt-loader.ts`:

```ts
import type { PromptFeature, PromptRecord } from "@/db/repositories/prompt-repository";

type PromptRepository = {
  findActiveBySlug(feature: PromptFeature, slug: string): Promise<PromptRecord | null>;
};

export function createPromptLoader(repository: PromptRepository) {
  return {
    async load(feature: PromptFeature, slug: string): Promise<PromptRecord> {
      const prompt = await repository.findActiveBySlug(feature, slug);

      if (!prompt) {
        throw new Error(`Prompt not found: ${feature}/${slug}`);
      }

      return prompt;
    },
  };
}
```

- [ ] **Step 4: Run prompt loader test**

Run:

```bash
npm run test -- src/ai/prompts/prompt-loader.test.ts
```

Expected: pass.

- [ ] **Step 5: Write failing recipe agent test**

Create `src/ai/agents/recipe-agent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRecipeAgent } from "./recipe-agent";

describe("RecipeAgent", () => {
  it("uses prompt loader and AIService to generate a structured recipe", async () => {
    const calls: string[] = [];
    const agent = createRecipeAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_1",
          slug: "recipe-from-ingredients",
          feature: "recipes",
          systemPrompt: "You are a pastry chef.",
          userTemplate: "Ingredients: {{ingredients}}",
          model: "gpt-4o-mini",
          temperature: 0.3,
          active: true,
          version: 1,
        }),
      },
      aiService: {
        generateText: async () => "",
        generateImage: async () => ({ url: "" }),
        generateObject: async (input) => {
          calls.push(input.prompt);
          return {
            title: "Butter cookies",
            description: "Simple tender cookies.",
            ingredients: ["butter", "flour", "eggs"],
            steps: ["Mix ingredients", "Bake"],
          };
        },
      },
    });

    const result = await agent.execute({ ingredients: ["eggs", "butter", "flour"] });

    expect(calls[0]).toBe("Ingredients: eggs, butter, flour");
    expect(result.title).toBe("Butter cookies");
  });
});
```

- [ ] **Step 6: Verify recipe agent test fails**

Run:

```bash
npm run test -- src/ai/agents/recipe-agent.test.ts
```

Expected: fail because recipe agent and schema do not exist.

- [ ] **Step 7: Implement schemas and agents**

Create `src/ai/schemas/recipe.ts`:

```ts
import { z } from "zod";

export const recipeOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export type RecipeOutput = z.infer<typeof recipeOutputSchema>;
```

Create `src/ai/schemas/vision.ts`:

```ts
import { z } from "zod";

export const visionOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  similarRecipe: z.string(),
});

export type VisionOutput = z.infer<typeof visionOutputSchema>;
```

Create `src/ai/schemas/photoshoot.ts`:

```ts
import { z } from "zod";

export const photoshootOutputSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string(),
});

export type PhotoshootOutput = z.infer<typeof photoshootOutputSchema>;
```

Create `src/ai/schemas/carousel.ts`:

```ts
import { z } from "zod";

export const carouselOutputSchema = z.object({
  cover: z.string(),
  slides: z.array(z.string()),
  captions: z.array(z.string()),
});

export type CarouselOutput = z.infer<typeof carouselOutputSchema>;
```

Create `src/ai/agents/recipe-agent.ts`:

```ts
import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import { recipeOutputSchema, type RecipeOutput } from "../schemas/recipe";

type PromptLoader = {
  load(feature: "recipes", slug: string): Promise<PromptRecord>;
};

export type RecipeAgentInput = {
  ingredients: string[];
};

export function createRecipeAgent(dependencies: { promptLoader: PromptLoader; aiService: AIService }) {
  return {
    async execute(input: RecipeAgentInput): Promise<RecipeOutput> {
      const prompt = await dependencies.promptLoader.load("recipes", "recipe-from-ingredients");
      const renderedPrompt = prompt.userTemplate.replace("{{ingredients}}", input.ingredients.join(", "));

      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: renderedPrompt,
        model: prompt.model,
        temperature: prompt.temperature,
        schema: recipeOutputSchema,
      });
    },
  };
}
```

Create equivalent skeletons for remaining agents:

```ts
// src/ai/agents/vision-agent.ts
import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import { visionOutputSchema, type VisionOutput } from "../schemas/vision";

type PromptLoader = { load(feature: "vision", slug: string): Promise<PromptRecord> };
export type VisionAgentInput = { imageUrl: string };

export function createVisionAgent(dependencies: { promptLoader: PromptLoader; aiService: AIService }) {
  return {
    async execute(input: VisionAgentInput): Promise<VisionOutput> {
      const prompt = await dependencies.promptLoader.load("vision", "dessert-identification");
      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: prompt.userTemplate.replace("{{imageUrl}}", input.imageUrl),
        model: prompt.model,
        temperature: prompt.temperature,
        schema: visionOutputSchema,
      });
    },
  };
}
```

```ts
// src/ai/agents/photoshoot-agent.ts
import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import { type PhotoshootOutput } from "../schemas/photoshoot";

type PromptLoader = { load(feature: "photoshoot", slug: string): Promise<PromptRecord> };
export type PhotoshootAgentInput = { imageUrl: string; style: string };

export function createPhotoshootAgent(dependencies: { promptLoader: PromptLoader; aiService: AIService }) {
  return {
    async execute(input: PhotoshootAgentInput): Promise<PhotoshootOutput> {
      const prompt = await dependencies.promptLoader.load("photoshoot", "product-photo");
      const renderedPrompt = prompt.userTemplate
        .replace("{{imageUrl}}", input.imageUrl)
        .replace("{{style}}", input.style);
      const image = await dependencies.aiService.generateImage({ prompt: renderedPrompt, model: prompt.model });
      return { imageUrl: image.url, prompt: renderedPrompt };
    },
  };
}
```

```ts
// src/ai/agents/carousel-agent.ts
import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import { carouselOutputSchema, type CarouselOutput } from "../schemas/carousel";

type PromptLoader = { load(feature: "carousel", slug: string): Promise<PromptRecord> };
export type CarouselAgentInput = { topic: string };

export function createCarouselAgent(dependencies: { promptLoader: PromptLoader; aiService: AIService }) {
  return {
    async execute(input: CarouselAgentInput): Promise<CarouselOutput> {
      const prompt = await dependencies.promptLoader.load("carousel", "instagram-carousel");
      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: prompt.userTemplate.replace("{{topic}}", input.topic),
        model: prompt.model,
        temperature: prompt.temperature,
        schema: carouselOutputSchema,
      });
    },
  };
}
```

- [ ] **Step 8: Run AI tests**

Run:

```bash
npm run test -- src/ai/prompts/prompt-loader.test.ts src/ai/agents/recipe-agent.test.ts
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add pastry-ai/src/ai
git commit -m "feat: add ai service and agents"
```

---

### Task 5: Add Feature Services

**Files:**
- Create: `src/features/recipes/recipe-service.ts`
- Create: `src/features/vision/vision-service.ts`
- Create: `src/features/photoshoot/photoshoot-service.ts`
- Create: `src/features/carousel/carousel-service.ts`
- Create: `src/features/users/user-service.ts`
- Test: `src/features/recipes/recipe-service.test.ts`
- Test: `src/features/users/user-service.test.ts`

**Interfaces:**
- Produces: `createRecipeService({ recipeAgent }).createFromIngredients(input)`.
- Produces: `createUserService({ userRepository }).registerTelegramUser(input)`.

- [ ] **Step 1: Write failing recipe service test**

Create `src/features/recipes/recipe-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRecipeService } from "./recipe-service";

describe("RecipeService", () => {
  it("validates ingredients and delegates to RecipeAgent", async () => {
    const service = createRecipeService({
      recipeAgent: {
        execute: async (input) => ({
          title: input.ingredients.join(" "),
          description: "Generated recipe",
          ingredients: input.ingredients,
          steps: ["Mix", "Bake"],
        }),
      },
    });

    const recipe = await service.createFromIngredients({ ingredientsText: "eggs, butter, flour" });

    expect(recipe.ingredients).toEqual(["eggs", "butter", "flour"]);
  });

  it("rejects empty ingredients", async () => {
    const service = createRecipeService({
      recipeAgent: {
        execute: async () => ({
          title: "",
          description: "",
          ingredients: [],
          steps: [],
        }),
      },
    });

    await expect(service.createFromIngredients({ ingredientsText: " " })).rejects.toThrow("Ingredients are required");
  });
});
```

- [ ] **Step 2: Verify recipe service test fails**

Run:

```bash
npm run test -- src/features/recipes/recipe-service.test.ts
```

Expected: fail because service does not exist.

- [ ] **Step 3: Implement recipe service and sibling services**

Create `src/features/recipes/recipe-service.ts`:

```ts
import { z } from "zod";
import type { RecipeAgentInput } from "@/ai/agents/recipe-agent";
import type { RecipeOutput } from "@/ai/schemas/recipe";

const recipeInputSchema = z.object({
  ingredientsText: z.string().trim().min(1, "Ingredients are required"),
});

type RecipeAgent = {
  execute(input: RecipeAgentInput): Promise<RecipeOutput>;
};

export function createRecipeService(dependencies: { recipeAgent: RecipeAgent }) {
  return {
    async createFromIngredients(input: { ingredientsText: string }): Promise<RecipeOutput> {
      const parsed = recipeInputSchema.parse(input);
      const ingredients = parsed.ingredientsText
        .split(",")
        .map((ingredient) => ingredient.trim())
        .filter(Boolean);

      if (ingredients.length === 0) {
        throw new Error("Ingredients are required");
      }

      return dependencies.recipeAgent.execute({ ingredients });
    },
  };
}
```

Create `src/features/vision/vision-service.ts`:

```ts
import { z } from "zod";
import type { VisionAgentInput } from "@/ai/agents/vision-agent";
import type { VisionOutput } from "@/ai/schemas/vision";

const visionInputSchema = z.object({ imageUrl: z.string().url() });
type VisionAgent = { execute(input: VisionAgentInput): Promise<VisionOutput> };

export function createVisionService(dependencies: { visionAgent: VisionAgent }) {
  return {
    identifyDessert(input: { imageUrl: string }): Promise<VisionOutput> {
      return dependencies.visionAgent.execute(visionInputSchema.parse(input));
    },
  };
}
```

Create `src/features/photoshoot/photoshoot-service.ts`:

```ts
import { z } from "zod";
import type { PhotoshootAgentInput } from "@/ai/agents/photoshoot-agent";
import type { PhotoshootOutput } from "@/ai/schemas/photoshoot";

const photoshootInputSchema = z.object({
  imageUrl: z.string().url(),
  style: z.string().trim().min(1),
});

type PhotoshootAgent = { execute(input: PhotoshootAgentInput): Promise<PhotoshootOutput> };

export function createPhotoshootService(dependencies: { photoshootAgent: PhotoshootAgent }) {
  return {
    generateProductPhoto(input: { imageUrl: string; style: string }): Promise<PhotoshootOutput> {
      return dependencies.photoshootAgent.execute(photoshootInputSchema.parse(input));
    },
  };
}
```

Create `src/features/carousel/carousel-service.ts`:

```ts
import { z } from "zod";
import type { CarouselAgentInput } from "@/ai/agents/carousel-agent";
import type { CarouselOutput } from "@/ai/schemas/carousel";

const carouselInputSchema = z.object({ topic: z.string().trim().min(1) });
type CarouselAgent = { execute(input: CarouselAgentInput): Promise<CarouselOutput> };

export function createCarouselService(dependencies: { carouselAgent: CarouselAgent }) {
  return {
    createInstagramCarousel(input: { topic: string }): Promise<CarouselOutput> {
      return dependencies.carouselAgent.execute(carouselInputSchema.parse(input));
    },
  };
}
```

- [ ] **Step 4: Run recipe service test**

Run:

```bash
npm run test -- src/features/recipes/recipe-service.test.ts
```

Expected: pass.

- [ ] **Step 5: Write failing user service test**

Create `src/features/users/user-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createUserService } from "./user-service";

describe("UserService", () => {
  it("registers a Telegram user through the repository", async () => {
    const service = createUserService({
      userRepository: {
        upsertTelegramUser: async (input) => ({
          id: "user_1",
          telegramId: input.telegramId,
          username: input.username ?? null,
          name: input.name ?? null,
          plan: "FREE",
          credits: 10,
        }),
      },
    });

    const user = await service.registerTelegramUser({
      telegramId: "42",
      username: "chef",
      name: "Chef",
    });

    expect(user.telegramId).toBe("42");
  });
});
```

- [ ] **Step 6: Verify user service test fails**

Run:

```bash
npm run test -- src/features/users/user-service.test.ts
```

Expected: fail because user service does not exist.

- [ ] **Step 7: Implement user service**

Create `src/features/users/user-service.ts`:

```ts
import { z } from "zod";
import type { UpsertTelegramUserInput, UserRecord } from "@/db/repositories/user-repository";

const telegramUserSchema = z.object({
  telegramId: z.string().min(1),
  username: z.string().nullish(),
  name: z.string().nullish(),
});

type UserRepository = {
  upsertTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord>;
};

export function createUserService(dependencies: { userRepository: UserRepository }) {
  return {
    registerTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord> {
      return dependencies.userRepository.upsertTelegramUser(telegramUserSchema.parse(input));
    },
  };
}
```

- [ ] **Step 8: Run feature tests**

Run:

```bash
npm run test -- src/features/recipes/recipe-service.test.ts src/features/users/user-service.test.ts
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add pastry-ai/src/features
git commit -m "feat: add feature service layer"
```

---

### Task 6: Add grammY Bot Bootstrap and Webhook Route

**Files:**
- Create: `src/bot/create-bot.ts`
- Create: `src/bot/context.ts`
- Create: `src/bot/commands/start.ts`
- Create: `src/bot/commands/help.ts`
- Create: `src/bot/commands/profile.ts`
- Create: `src/bot/middleware/error-handler.ts`
- Create: `src/bot/middleware/logger.ts`
- Create: `src/bot/middleware/auth.ts`
- Create: `src/bot/middleware/subscription.ts`
- Create: `src/bot/middleware/session.ts`
- Create: `src/app/api/telegram/webhook/route.ts`
- Test: `src/bot/commands/start.test.ts`
- Test: `src/app/api/telegram/webhook/route.test.ts`

**Interfaces:**
- Produces: `createPastryBot(dependencies): Bot<PastryBotContext>`.
- Produces: webhook `POST(request: Request): Promise<Response>`.

- [ ] **Step 1: Write failing `/start` command test**

Create `src/bot/commands/start.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildStartMessage } from "./start";

describe("buildStartMessage", () => {
  it("welcomes pastry chefs", () => {
    expect(buildStartMessage("Chef")).toContain("Chef");
    expect(buildStartMessage("Chef")).toContain("pastry");
  });
});
```

- [ ] **Step 2: Verify command test fails**

Run:

```bash
npm run test -- src/bot/commands/start.test.ts
```

Expected: fail because command module does not exist.

- [ ] **Step 3: Implement bot context, commands, and middleware**

Create `src/bot/context.ts`:

```ts
import type { Context, SessionFlavor } from "grammy";

export type BotSession = {
  lastFeature?: "recipes" | "vision" | "photoshoot" | "carousel";
};

export type PastryBotContext = Context & SessionFlavor<BotSession>;
```

Create `src/bot/commands/start.ts`:

```ts
import type { Composer } from "grammy";
import type { PastryBotContext } from "../context";

type UserService = {
  registerTelegramUser(input: { telegramId: string; username?: string | null; name?: string | null }): Promise<unknown>;
};

export function buildStartMessage(name: string): string {
  return `Welcome, ${name}. Send ingredients or a dessert photo to start your pastry workflow.`;
}

export function registerStartCommand(composer: Composer<PastryBotContext>, userService: UserService): void {
  composer.command("start", async (ctx) => {
    if (ctx.from) {
      await userService.registerTelegramUser({
        telegramId: String(ctx.from.id),
        username: ctx.from.username,
        name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || null,
      });
    }

    await ctx.reply(buildStartMessage(ctx.from?.first_name ?? "chef"));
  });
}
```

Create `src/bot/commands/help.ts`:

```ts
import type { Composer } from "grammy";
import type { PastryBotContext } from "../context";

export function buildHelpMessage(): string {
  return [
    "Available commands:",
    "/start - register and begin",
    "/profile - show your profile",
    "Send ingredients like: eggs, butter, flour",
  ].join("\n");
}

export function registerHelpCommand(composer: Composer<PastryBotContext>): void {
  composer.command("help", async (ctx) => {
    await ctx.reply(buildHelpMessage());
  });
}
```

Create `src/bot/commands/profile.ts`:

```ts
import type { Composer } from "grammy";
import type { PastryBotContext } from "../context";

export function registerProfileCommand(composer: Composer<PastryBotContext>): void {
  composer.command("profile", async (ctx) => {
    await ctx.reply("Profile is ready for plan and credit tracking.");
  });
}
```

Create middleware files:

```ts
// src/bot/middleware/error-handler.ts
import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function errorHandler(): MiddlewareFn<PastryBotContext> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error("Telegram handler failed", error);
      await ctx.reply("Something went wrong. Please try again.");
    }
  };
}
```

```ts
// src/bot/middleware/logger.ts
import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function logger(): MiddlewareFn<PastryBotContext> {
  return async (ctx, next) => {
    console.info("Telegram update", { updateId: ctx.update.update_id });
    await next();
  };
}
```

```ts
// src/bot/middleware/auth.ts
import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function auth(): MiddlewareFn<PastryBotContext> {
  return async (_ctx, next) => next();
}
```

```ts
// src/bot/middleware/subscription.ts
import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function subscription(): MiddlewareFn<PastryBotContext> {
  return async (_ctx, next) => next();
}
```

```ts
// src/bot/middleware/session.ts
import { session } from "grammy";
import type { BotSession, PastryBotContext } from "../context";

export function sessionMiddleware() {
  return session<BotSession, PastryBotContext>({
    initial: () => ({}),
  });
}
```

- [ ] **Step 4: Run command test**

Run:

```bash
npm run test -- src/bot/commands/start.test.ts
```

Expected: pass.

- [ ] **Step 5: Write failing webhook secret test**

Create `src/app/api/telegram/webhook/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isValidTelegramSecret } from "./route";

describe("isValidTelegramSecret", () => {
  it("accepts matching secret token", () => {
    const request = new Request("https://example.com", {
      headers: { "x-telegram-bot-api-secret-token": "secret" },
    });

    expect(isValidTelegramSecret(request, "secret")).toBe(true);
  });

  it("rejects missing secret token", () => {
    const request = new Request("https://example.com");

    expect(isValidTelegramSecret(request, "secret")).toBe(false);
  });
});
```

- [ ] **Step 6: Verify webhook test fails**

Run:

```bash
npm run test -- src/app/api/telegram/webhook/route.test.ts
```

Expected: fail because route module does not exist.

- [ ] **Step 7: Implement bot factory and webhook route**

Create `src/bot/create-bot.ts`:

```ts
import { Bot } from "grammy";
import type { PastryBotContext } from "./context";
import { registerHelpCommand } from "./commands/help";
import { registerProfileCommand } from "./commands/profile";
import { registerStartCommand } from "./commands/start";
import { auth } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { sessionMiddleware } from "./middleware/session";
import { subscription } from "./middleware/subscription";

type BotDependencies = {
  token: string;
  userService: Parameters<typeof registerStartCommand>[1];
};

export function createPastryBot(dependencies: BotDependencies): Bot<PastryBotContext> {
  const bot = new Bot<PastryBotContext>(dependencies.token);

  bot.use(errorHandler());
  bot.use(logger());
  bot.use(sessionMiddleware());
  bot.use(auth());
  bot.use(subscription());

  registerStartCommand(bot, dependencies.userService);
  registerHelpCommand(bot);
  registerProfileCommand(bot);

  return bot;
}
```

Create `src/app/api/telegram/webhook/route.ts`:

```ts
import { webhookCallback } from "grammy";
import { createPastryBot } from "@/bot/create-bot";
import { createUserService } from "@/features/users/user-service";
import { createUserRepository } from "@/db/repositories/user-repository";
import { prisma } from "@/db/prisma";
import { loadEnv } from "@/lib/env";

export const runtime = "nodejs";

export function isValidTelegramSecret(request: Request, expectedSecret: string): boolean {
  return request.headers.get("x-telegram-bot-api-secret-token") === expectedSecret;
}

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (!isValidTelegramSecret(request, env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRepository = createUserRepository(prisma.user);
  const userService = createUserService({ userRepository });
  const bot = createPastryBot({ token: env.TELEGRAM_BOT_TOKEN, userService });

  return webhookCallback(bot, "std/http")(request);
}
```

- [ ] **Step 8: Run bot tests**

Run:

```bash
npm run test -- src/bot/commands/start.test.ts src/app/api/telegram/webhook/route.test.ts
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add pastry-ai/src/bot pastry-ai/src/app/api/telegram
git commit -m "feat: add telegram webhook foundation"
```

---

### Task 7: Add Supabase Clients and Admin UI Foundation

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/prompts/page.tsx`
- Create: `src/app/admin/photo-styles/page.tsx`
- Create: `src/app/admin/carousel-templates/page.tsx`
- Create: `src/app/admin/history/page.tsx`
- Create: `src/app/admin/usage/page.tsx`
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/app/login/page.tsx`
- Test: `src/app/admin/admin-pages.test.ts`

**Interfaces:**
- Produces: admin routes required by the spec.
- Produces: `cn(...inputs: ClassValue[]): string`.

- [ ] **Step 1: Write failing admin routes test**

Create `src/app/admin/admin-pages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminSections } from "./layout";

describe("adminSections", () => {
  it("contains the required admin pages", () => {
    expect(adminSections.map((section) => section.href)).toEqual([
      "/admin",
      "/admin/users",
      "/admin/prompts",
      "/admin/photo-styles",
      "/admin/carousel-templates",
      "/admin/history",
      "/admin/usage",
      "/admin/settings",
    ]);
  });
});
```

- [ ] **Step 2: Verify admin test fails**

Run:

```bash
npm run test -- src/app/admin/admin-pages.test.ts
```

Expected: fail because admin layout does not exist.

- [ ] **Step 3: Implement utilities and Supabase clients**

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { loadEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = loadEnv();
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
```

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { loadEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = loadEnv();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
```

Create `src/lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const env = loadEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 4: Implement local UI primitives**

Create `src/components/ui/button.tsx`:

```tsx
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "default" | "outline";
};

export function Button({ asChild, className, variant = "default", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors",
        variant === "default" && "bg-foreground text-background hover:opacity-90",
        variant === "outline" && "border border-border bg-transparent hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
```

Create `src/components/ui/card.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-white p-5 shadow-sm", className)} {...props} />;
}
```

- [ ] **Step 5: Implement admin layout and pages**

Create `src/app/admin/layout.tsx`:

```tsx
import Link from "next/link";

export const adminSections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/prompts", label: "Prompts" },
  { href: "/admin/photo-styles", label: "Photo Styles" },
  { href: "/admin/carousel-templates", label: "Carousel Templates" },
  { href: "/admin/history", label: "History" },
  { href: "/admin/usage", label: "Usage" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-white p-6 md:block">
        <h1 className="text-lg font-semibold">Pastry AI</h1>
        <nav className="mt-8 flex flex-col gap-1">
          {adminSections.map((section) => (
            <Link className="rounded-md px-3 py-2 text-sm hover:bg-muted" href={section.href} key={section.href}>
              {section.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="px-5 py-6 md:ml-64 md:px-8">{children}</main>
    </div>
  );
}
```

Create `src/app/admin/page.tsx`:

```tsx
import { Card } from "@/components/ui/card";

const cards = [
  { label: "Users", value: "0" },
  { label: "Requests", value: "0" },
  { label: "AI Cost", value: "$0.00" },
  { label: "Subscriptions", value: "0" },
  { label: "Errors", value: "0" },
];

export default function AdminDashboardPage() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

For each section page, use this exact pattern with the matching title:

```tsx
export default function AdminUsersPage() {
  return (
    <section className="space-y-2">
      <h2 className="text-2xl font-semibold">Users</h2>
      <p className="text-sm text-muted-foreground">Management surface is ready for service-backed data.</p>
    </section>
  );
}
```

Create equivalent components named `AdminPromptsPage`, `AdminPhotoStylesPage`, `AdminCarouselTemplatesPage`, `AdminHistoryPage`, `AdminUsagePage`, and `AdminSettingsPage`.

Create `src/app/login/page.tsx`:

```tsx
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Admin login</h1>
        <p className="text-sm text-muted-foreground">Supabase Auth will be connected in a later implementation slice.</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run admin test**

Run:

```bash
npm run test -- src/app/admin/admin-pages.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add pastry-ai/src/lib/supabase pastry-ai/src/lib/utils.ts pastry-ai/src/components pastry-ai/src/app/admin pastry-ai/src/app/login
git commit -m "feat: add admin dashboard foundation"
```

---

### Task 8: Final Verification and Cleanup

**Files:**
- Modify: `README.md`
- Review: all files changed by Tasks 1-7.

**Interfaces:**
- Produces: clear setup instructions and passing verification command.

- [ ] **Step 1: Write README update**

Replace `README.md` with:

```md
# AI Pastry Assistant

Production-ready foundation for an AI-powered Telegram assistant for pastry chefs.

## Stack

- Next.js App Router
- TypeScript
- Vercel AI SDK
- grammY
- Prisma with Supabase Postgres
- Supabase Storage and Auth clients
- Tailwind CSS
- shadcn-style local UI primitives
- Zod and React Hook Form
- Vitest

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Fill `.env` before running the Telegram webhook or AI flows.

## Verification

```bash
npm run verify
```

## Architecture

Routes live in `src/app`. Telegram code lives in `src/bot` and delegates to feature services. Feature services live in `src/features`. AI agents live in `src/ai/agents` and call `AIService`. Prisma and repository code live in `src/db`.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run verify
```

Expected: lint, typecheck, tests, and build pass.

- [ ] **Step 3: Inspect Git state**

Run:

```bash
git status --short
```

Expected: only intentional files are modified or untracked.

- [ ] **Step 4: Commit**

```bash
git add pastry-ai/README.md
git commit -m "docs: document pastry ai foundation"
```

- [ ] **Step 5: Report final verification evidence**

Record the exact successful commands:

```text
npm run verify
git status --short
```

Expected: `npm run verify` passes; `git status --short` contains no uncommitted implementation changes except intentionally ignored local files.

---

## Self-Review Notes

- Spec coverage: The plan covers dependency normalization, `src/app`, Prisma schema, AI service, prompt loader, agents, feature services, grammY webhook, middleware, Supabase clients, admin pages, `.env.example`, and verification.
- Scope boundary: Complete MVP AI behavior, admin CRUD, billing, localization, production Supabase policies, and full conversation flows remain outside this foundation by design.
- Type consistency: `PromptFeature`, `PromptRecord`, `AIService`, service factories, and bot dependencies are introduced before downstream tasks consume them.

