# RU/EU Migration Phase D Minimal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the app for the future EU ingress -> RU app/db split without cutting production traffic over in this phase.

**Architecture:** Keep the current direct runtime behavior as the default, but introduce explicit boundaries for AI transport, outbound prompt sanitization, internal service auth, and RU deployment configuration. The implementation should be additive, test-first, and shaped so later cutover work becomes mostly wiring rather than large refactors.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Prisma, grammY, Docker Compose, PostgreSQL.

## Global Constraints

- No production cutover to RU in this phase.
- No live webhook move from EU to RU in this phase.
- No standalone gateway service deployment in this phase.
- No removal of the current direct provider integrations.
- No database schema redesign beyond what is needed for configuration and deployment compatibility.

---

## File Structure

- Modify: `src/lib/env.ts` - make Supabase variables optional and add transition config variables.
- Modify: `src/lib/env.test.ts` - cover startup without Supabase and with internal config variables.
- Create: `src/lib/internal-service-auth.ts` - shared-secret header name and request verification helper.
- Create: `src/lib/internal-service-auth.test.ts` - verify accepted/rejected internal requests.
- Create: `src/ai/provider/ai-request-sanitizer.ts` - deterministic outbound prompt sanitization helpers.
- Create: `src/ai/provider/ai-request-sanitizer.test.ts` - cover whitespace cleanup, empty input handling, and KIE prompt truncation boundary preservation.
- Create: `src/ai/provider/ai-transport.ts` - single AI transport boundary with direct mode and gateway-ready mode.
- Create: `src/ai/provider/ai-transport.test.ts` - cover mode selection and sanitizer application.
- Modify: `src/ai/provider/openai-provider.ts` - delegate image generation through the new transport layer and stop owning KIE routing logic directly.
- Modify: `src/ai/provider/openai-provider.test.ts` - assert transport-facing behavior stays intact for multimodal and image-edit paths.
- Modify: `src/ai/provider/kie-provider.ts` - accept already-sanitized prompt input and keep provider-specific polling/retry logic focused.
- Modify: `src/ai/provider/kie-provider.test.ts` - verify sanitized prompt submission and legacy retry behavior.
- Modify: `src/app/api/telegram/webhook/route.ts` - wire internal auth helpers and central AI service creation without changing public route behavior.
- Modify: `src/app/api/telegram/webhook/route.test.ts` - verify public route remains direct-mode compatible.
- Create: `src/app/api/internal/telegram/route.ts` - minimal internal ingress contract for future EU forwarding.
- Create: `src/app/api/internal/telegram/route.test.ts` - verify secret validation and forwarding behavior.
- Modify: `src/app/admin/settings/page.tsx` - present transition-oriented runtime keys instead of Supabase-first runtime assumptions.
- Create: `src/app/admin/settings/page.test.tsx` or extend an existing admin settings test file - verify new key listing and labels.
- Create: `deploy/ru/docker-compose.yml` - RU app runtime with app, env file reference, uploads/log mounts, and PostgreSQL connection expectations.
- Create: `deploy/ru/.env.example` - RU deploy template with transition variables.
- Create: `deploy/ru/README.md` - short deployment notes for RU host path/volume expectations.

### Task 1: Runtime Config And Internal Auth

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\lib\internal-service-auth.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\lib\internal-service-auth.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\lib\env.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\lib\env.test.ts`

**Interfaces:**
- Consumes: `loadEnv(source?: Record<string, string | undefined>): AppEnv`
- Produces: `INTERNAL_AUTH_HEADER: "x-internal-shared-secret"`, `isValidInternalServiceRequest(request: Request, expectedSecret: string): boolean`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";
import {
  INTERNAL_AUTH_HEADER,
  isValidInternalServiceRequest,
} from "./internal-service-auth";

describe("loadEnv transition config", () => {
  it("starts without Supabase variables when core app config is present", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
    });

    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  it("parses optional internal routing variables", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
      INTERNAL_API_BASE_URL: "http://ru-app:3000",
      INTERNAL_API_SHARED_SECRET: "shared-secret",
      INTERNAL_TELEGRAM_INGRESS_URL: "http://ru-app:3000/api/internal/telegram",
      INTERNAL_AI_GATEWAY_URL: "http://ru-app:3000/api/internal/ai",
      APP_REGION: "ru",
      APP_ROLE: "app",
    });

    expect(env.INTERNAL_API_SHARED_SECRET).toBe("shared-secret");
    expect(env.APP_REGION).toBe("ru");
  });
});

describe("isValidInternalServiceRequest", () => {
  it("accepts matching internal shared secret", () => {
    const request = new Request("https://example.com", {
      headers: { [INTERNAL_AUTH_HEADER]: "shared-secret" },
    });

    expect(isValidInternalServiceRequest(request, "shared-secret")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/env.test.ts src/lib/internal-service-auth.test.ts`
Expected: FAIL because `SUPABASE_*` is still required and `internal-service-auth.ts` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```typescript
// src/lib/env.ts
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  INTERNAL_API_BASE_URL: z.string().url().optional(),
  INTERNAL_API_SHARED_SECRET: z.string().min(1).optional(),
  INTERNAL_TELEGRAM_INGRESS_URL: z.string().url().optional(),
  INTERNAL_AI_GATEWAY_URL: z.string().url().optional(),
  APP_REGION: z.enum(["eu", "ru"]).optional(),
  APP_ROLE: z.enum(["ingress", "app", "cron"]).optional(),
});

// src/lib/internal-service-auth.ts
export const INTERNAL_AUTH_HEADER = "x-internal-shared-secret";

export function isValidInternalServiceRequest(
  request: Request,
  expectedSecret: string,
): boolean {
  return request.headers.get(INTERNAL_AUTH_HEADER) === expectedSecret;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/env.test.ts src/lib/internal-service-auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts src/lib/internal-service-auth.ts src/lib/internal-service-auth.test.ts
git commit -m "refactor: add transition runtime config"
```

### Task 2: AI Sanitization And Shared Transport

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\ai-request-sanitizer.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\ai-request-sanitizer.test.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\ai-transport.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\ai-transport.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\openai-provider.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\openai-provider.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\kie-provider.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\kie-provider.test.ts`

**Interfaces:**
- Consumes: `GenerateTextInput`, `GenerateObjectInput<TOutput>`, `GenerateImageInput` from `src/ai/provider/ai-service.ts`
- Produces: `sanitizeOutboundPrompt(prompt: string): string`, `createAITransport(config?: { gatewayUrl?: string; sharedSecret?: string }): { generateImage(input: GenerateImageInput): Promise<{ url: string }> }`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it, vi } from "vitest";
import { sanitizeOutboundPrompt } from "./ai-request-sanitizer";
import { createAITransport } from "./ai-transport";

describe("sanitizeOutboundPrompt", () => {
  it("normalizes multiline prompt noise without changing content meaning", () => {
    expect(
      sanitizeOutboundPrompt("  dessert  \n\nwith   berries   and cream  "),
    ).toBe("dessert with berries and cream");
  });
});

describe("createAITransport", () => {
  it("sanitizes prompts before direct KIE image generation", async () => {
    const directImage = vi.fn().mockResolvedValue({ url: "data:image/jpeg;base64,abc" });
    const transport = createAITransport({
      directGenerateImage: directImage,
    });

    await transport.generateImage({
      provider: "kie",
      model: "flux-kontext-pro",
      prompt: "  premium   dessert \n with berries ",
    });

    expect(directImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "premium dessert with berries",
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts`
Expected: FAIL because both modules do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```typescript
// src/ai/provider/ai-request-sanitizer.ts
export function sanitizeOutboundPrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim();
}

// src/ai/provider/ai-transport.ts
import { loadEnv } from "@/lib/env";
import type { GenerateImageInput } from "./ai-service";
import { sanitizeOutboundPrompt } from "./ai-request-sanitizer";

export function createAITransport(dependencies: {
  directGenerateImage: (input: GenerateImageInput) => Promise<{ url: string }>;
}) {
  const env = loadEnv();

  return {
    async generateImage(input: GenerateImageInput) {
      const sanitized = { ...input, prompt: sanitizeOutboundPrompt(input.prompt) };

      if (env.INTERNAL_AI_GATEWAY_URL && env.INTERNAL_API_SHARED_SECRET) {
        return fetch(env.INTERNAL_AI_GATEWAY_URL, {
          body: JSON.stringify(sanitized),
          headers: {
            "content-type": "application/json",
            "x-internal-shared-secret": env.INTERNAL_API_SHARED_SECRET,
          },
          method: "POST",
        }).then(async (response) => {
          if (!response.ok) throw new Error("Internal AI gateway request failed");
          return (await response.json()) as { url: string };
        });
      }

      return dependencies.directGenerateImage(sanitized);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/provider/ai-request-sanitizer.ts src/ai/provider/ai-request-sanitizer.test.ts src/ai/provider/ai-transport.ts src/ai/provider/ai-transport.test.ts src/ai/provider/openai-provider.ts src/ai/provider/openai-provider.test.ts src/ai/provider/kie-provider.ts src/ai/provider/kie-provider.test.ts
git commit -m "refactor: add ai transport boundary"
```

### Task 3: Internal Telegram Contract And Public Route Stability

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\internal\telegram\route.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\internal\telegram\route.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\telegram\webhook\route.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\telegram\webhook\route.test.ts`

**Interfaces:**
- Consumes: `isValidTelegramSecret(request: Request, expectedSecret: string): boolean`, `isValidInternalServiceRequest(request: Request, expectedSecret: string): boolean`
- Produces: `POST(request: Request): Promise<Response>` for `/api/internal/telegram`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it, vi } from "vitest";
import { POST as internalPost } from "./route";

describe("POST /api/internal/telegram", () => {
  it("rejects requests without the shared internal secret", async () => {
    const response = await internalPost(
      new Request("https://example.com/api/internal/telegram", {
        body: JSON.stringify({ update_id: 42 }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/telegram/route.test.ts src/app/api/telegram/webhook/route.test.ts`
Expected: FAIL because the internal route does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```typescript
// src/app/api/internal/telegram/route.ts
import { POST as handleTelegramWebhook } from "@/app/api/telegram/webhook/route";
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const forwardedRequest = new Request(request.url, {
    body: await request.text(),
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": env.TELEGRAM_WEBHOOK_SECRET,
    },
    method: "POST",
  });

  return handleTelegramWebhook(forwardedRequest);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/telegram/route.test.ts src/app/api/telegram/webhook/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/internal/telegram/route.ts src/app/api/internal/telegram/route.test.ts src/app/api/telegram/webhook/route.ts src/app/api/telegram/webhook/route.test.ts
git commit -m "feat: add internal telegram ingress route"
```

### Task 4: Admin Runtime View And RU Deployment Artifacts

**Files:**
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\admin\settings\page.tsx`
- Create or Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\admin\settings\page.test.tsx`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\deploy\ru\docker-compose.yml`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\deploy\ru\.env.example`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\deploy\ru\README.md`

**Interfaces:**
- Consumes: transition config keys from `loadEnv()`
- Produces: RU deployment files for app startup and updated admin runtime rows

- [ ] **Step 1: Write the failing tests**

```typescript
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminSettingsPage from "./page";

describe("AdminSettingsPage", () => {
  it("shows transition runtime keys for internal RU/EU deployment", async () => {
    const text = renderToStaticMarkup(await AdminSettingsPage());

    expect(text).toContain("INTERNAL_API_BASE_URL");
    expect(text).toContain("INTERNAL_AI_GATEWAY_URL");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/admin/settings/page.test.tsx`
Expected: FAIL because the settings page still exposes Supabase-focused runtime rows.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// src/app/admin/settings/page.tsx
const envKeys = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "CRON_SECRET",
  "INTERNAL_API_BASE_URL",
  "INTERNAL_API_SHARED_SECRET",
  "INTERNAL_TELEGRAM_INGRESS_URL",
  "INTERNAL_AI_GATEWAY_URL",
  "APP_REGION",
  "APP_ROLE",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
];
```

```yaml
# deploy/ru/docker-compose.yml
services:
  pastry-ai:
    build:
      context: ../..
      dockerfile: Dockerfile
    env_file:
      - .env
    ports:
      - "3000:3000"
    restart: unless-stopped
    volumes:
      - /srv/pastry-ai/uploads:/app/public/uploads
      - /srv/pastry-ai/logs:/app/logs
```

- [ ] **Step 4: Run tests and static verification**

Run: `npm test -- src/app/admin/settings/page.test.tsx`
Expected: PASS

Run: `docker compose -f deploy/ru/docker-compose.yml config`
Expected: exit code 0 and normalized compose output

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/settings/page.tsx src/app/admin/settings/page.test.tsx deploy/ru/docker-compose.yml deploy/ru/.env.example deploy/ru/README.md
git commit -m "chore: add ru deployment artifacts"
```

## Self-Review

### 1. Spec coverage

- Optional Supabase runtime: covered by Task 1.
- Shared AI transport boundary: covered by Task 2.
- Outbound AI sanitization: covered by Task 2.
- Internal service auth/config and Telegram forwarding contract: covered by Tasks 1 and 3.
- Direct mode remains available: covered by Task 2 and regression checks in Task 3.
- Admin settings updated for transition architecture: covered by Task 4.
- RU deployment artifacts committed: covered by Task 4.

No uncovered Phase D requirements remain.

### 2. Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task includes concrete files, commands, and target interfaces.
- Docker env file content is intentionally minimal but explicit; expand only if implementation proves a missing required variable.

### 3. Type consistency

- `loadEnv()` remains the source of truth for transition variables in Tasks 1, 2, and 3.
- `isValidInternalServiceRequest()` is the shared verifier reused by the internal route.
- `createAITransport()` is the single new image transport boundary referenced by provider code.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-d-minimal.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
