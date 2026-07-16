# RU/EU Migration Phase E Gateways Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring up the EU gateway contour for Telegram and AI in parallel with the current production deployment, without switching live traffic yet.

**Architecture:** Keep the current EU production application running unchanged while adding a separate EU gateway deployment path that forwards to RU over WireGuard using internal shared-secret auth. Validate gateway behavior, healthchecks, and EU logging/persistence constraints before any cutover work in Phase F.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Docker Compose, Coolify, WireGuard, PostgreSQL, existing EU/RU VPS infrastructure.

## Global Constraints

- No production webhook switch in this phase.
- No production AI traffic switch in this phase.
- No disabling or deleting the current EU application deployment.
- No production cutover to RU in this phase.
- No removal of Supabase as rollback infrastructure in this phase.

---

## File Structure

- Create: `src/app/api/internal/ai/route.ts` - EU AI gateway receiving endpoint for authenticated internal image-generation relay.
- Create: `src/app/api/internal/ai/route.test.ts` - tests for internal auth, forwarding mode, and failure handling.
- Modify: `src/ai/provider/openai-provider.ts` - ensure internal AI gateway route can reuse direct provider image generation logic cleanly without loops.
- Modify: `src/ai/provider/openai-provider.test.ts` - cover internal gateway-facing helper behavior.
- Create: `src/app/api/health/gateway/route.ts` - non-sensitive healthcheck endpoint for gateway readiness.
- Create: `src/app/api/health/gateway/route.test.ts` - verify safe health payload shape.
- Create: `deploy/eu-gateway/docker-compose.yml` - minimal EU gateway deployment artifact for separate Coolify or direct compose use.
- Create: `deploy/eu-gateway/.env.example` - EU gateway secret/URL template without real values.
- Create: `deploy/eu-gateway/README.md` - deployment instructions, coexistence rules, and rollback notes.
- Create: `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-e-report.md` - execution report for the live EU gateway bring-up.

### Task 1: Internal AI Gateway Endpoint

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\internal\ai\route.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\internal\ai\route.test.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\openai-provider.ts`
- Modify: `C:\Users\Roof\Documents\Телега\pastry-ai\src\ai\provider\openai-provider.test.ts`

**Interfaces:**
- Consumes: `isValidInternalServiceRequest(request: Request, expectedSecret: string): boolean`
- Consumes: `createOpenAIAIService(): AIService`
- Produces: `POST(request: Request): Promise<Response>` for `/api/internal/ai`
- Produces: a direct-image helper callable by the internal AI route without recursively re-entering the gateway transport

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("POST /api/internal/ai", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/ai", {
        body: JSON.stringify({
          provider: "kie",
          model: "flux-kontext-pro",
          prompt: "premium dessert",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/internal/ai/route.test.ts src/ai/provider/openai-provider.test.ts`
Expected: FAIL because the internal AI route does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```typescript
// src/app/api/internal/ai/route.ts
import { loadEnv } from "@/lib/env";
import { isValidInternalServiceRequest } from "@/lib/internal-service-auth";
import { createOpenAIAIService } from "@/ai/provider/openai-provider";

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (
    !env.INTERNAL_API_SHARED_SECRET ||
    !isValidInternalServiceRequest(request, env.INTERNAL_API_SHARED_SECRET)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json()) as {
    provider: "openai" | "openrouter" | "kie";
    prompt: string;
    model: string;
    imageUrl?: string;
    size?: "1024x1024" | "1024x1536" | "1536x1024";
    aspectRatio?: string;
  };

  const aiService = createOpenAIAIService({ gatewayMode: "disabled" });
  const result = await aiService.generateImage(payload);

  return Response.json(result);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/internal/ai/route.test.ts src/ai/provider/openai-provider.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/internal/ai/route.ts src/app/api/internal/ai/route.test.ts src/ai/provider/openai-provider.ts src/ai/provider/openai-provider.test.ts
git commit -m "feat: add internal ai gateway route"
```

### Task 2: Safe Gateway Healthchecks

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\health\gateway\route.ts`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\src\app\api\health\gateway\route.test.ts`

**Interfaces:**
- Consumes: non-sensitive runtime state only
- Produces: `GET(request?: Request): Promise<Response>` for `/api/health/gateway`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health/gateway", () => {
  it("returns a non-sensitive gateway readiness payload", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(JSON.stringify(body)).not.toContain("SECRET");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/health/gateway/route.test.ts`
Expected: FAIL because the route does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```typescript
// src/app/api/health/gateway/route.ts
export async function GET(): Promise<Response> {
  return Response.json({
    checks: {
      aiGatewayConfigured: Boolean(process.env.INTERNAL_AI_GATEWAY_URL),
      internalSecretConfigured: Boolean(process.env.INTERNAL_API_SHARED_SECRET),
    },
    status: "ok",
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/health/gateway/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/health/gateway/route.ts src/app/api/health/gateway/route.test.ts
git commit -m "feat: add gateway healthcheck route"
```

### Task 3: EU Gateway Deployment Artifacts

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\deploy\eu-gateway\docker-compose.yml`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\deploy\eu-gateway\.env.example`
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\deploy\eu-gateway\README.md`

**Interfaces:**
- Consumes: current app Dockerfile and runtime env contract
- Produces: separate EU gateway deployment path with transition-safe env template

- [ ] **Step 1: Write the failing static check**

```text
Check expectation:
- deploy/eu-gateway/docker-compose.yml exists
- deploy/eu-gateway/.env.example exists
- deploy/eu-gateway/README.md exists
- README explicitly says this deployment coexists with the current EU production app
```

- [ ] **Step 2: Run file existence check to verify it fails**

Run: `Get-ChildItem deploy/eu-gateway`
Expected: FAIL because the directory does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```yaml
# deploy/eu-gateway/docker-compose.yml
services:
  pastry-ai-eu-gateway:
    build:
      context: ../..
      dockerfile: Dockerfile
    env_file:
      - .env
    ports:
      - "3001:3000"
    restart: unless-stopped
```

```dotenv
# deploy/eu-gateway/.env.example
OPENAI_API_KEY=
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=
INTERNAL_API_SHARED_SECRET=
INTERNAL_API_BASE_URL=http://10.10.0.1:3000
INTERNAL_TELEGRAM_INGRESS_URL=http://10.10.0.1:3000/api/internal/telegram
INTERNAL_AI_GATEWAY_URL=
APP_REGION=eu
APP_ROLE=ingress
```

- [ ] **Step 4: Run static verification**

Run: `Get-Content deploy/eu-gateway/README.md`
Expected: includes coexistence and no-cutover notes

Run: `docker compose -f deploy/eu-gateway/docker-compose.yml config`
Expected: exit code 0 and normalized compose output

- [ ] **Step 5: Commit**

```bash
git add deploy/eu-gateway/docker-compose.yml deploy/eu-gateway/.env.example deploy/eu-gateway/README.md
git commit -m "chore: add eu gateway deployment artifacts"
```

### Task 4: Live EU Gateway Bring-Up And Verification Report

**Files:**
- Create: `C:\Users\Roof\Documents\Телега\pastry-ai\docs\superpowers\plans\2026-07-16-ru-eu-migration-phase-e-report.md`

**Interfaces:**
- Consumes: EU Coolify live inventory, RU internal route targets, deployment artifact paths
- Produces: execution report with deployment names, verification results, and rollback notes

- [ ] **Step 1: Write the report template before live actions**

```markdown
# RU/EU Migration Phase E Report

Date: 2026-07-16
Status: Draft

## Inventory Before Changes
## EU Gateway Deployment
## WireGuard And Internal Auth Verification
## Healthchecks
## Logging Review
## Production Safety Checks
## Rollback Notes
```

- [ ] **Step 2: Verify the report file exists before deployment work**

Run: `Get-Content docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-e-report.md`
Expected: PASS and shows the report skeleton.

- [ ] **Step 3: Execute the live Phase E work**

```text
- inventory the current EU Coolify resource names, ports, and live app commit
- create a separate EU gateway deployment/resource
- configure runtime secrets on EU
- start the EU gateway deployment
- verify RU internal Telegram endpoint reachability from EU over WireGuard
- verify internal AI route reachability in test mode
- inspect gateway logs for payload leakage during test requests
- record exact names, URLs, and rollback steps in the report
```

- [ ] **Step 4: Run live verification and complete the report**

Run:
- the exact EU deployment status command actually used during execution
- the exact EU->RU gateway test requests actually used during execution
- the exact log-inspection commands actually used during execution

Expected:
- gateway deployment healthy
- test forwarding works
- no payload bodies observed in intended gateway logs

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-e-report.md
git commit -m "docs: add phase e gateway deployment report"
```

## Self-Review

### 1. Spec coverage

- Parallel EU gateway bring-up: covered by Tasks 3 and 4.
- Telegram gateway deployment: covered by Tasks 3 and 4 plus Task 1 runtime endpoint support.
- AI gateway deployment: covered by Tasks 1, 3, and 4.
- WireGuard plus shared-secret auth: covered by Tasks 1 and 4.
- Healthchecks: covered by Task 2 and Task 4.
- Reduced EU logging/persistence expectations: documented in Task 3 and verified in Task 4.
- No cutover and no deletion of current EU production app: enforced in Global Constraints and Task 4.

No uncovered Phase E requirements remain.

### 2. Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Live-action steps in Task 4 are concrete but intentionally record the exact commands used during execution because those depend on the current Coolify/EU host state.
- Verification commands are explicit where already knowable and intentionally evidence-driven for live deployment work.

### 3. Type consistency

- `isValidInternalServiceRequest()` remains the shared internal verifier.
- `POST()` handlers under `/api/internal/*` stay aligned with the existing app route conventions.
- The EU gateway env template matches the current runtime contract and the Phase D transition variables.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-ru-eu-migration-phase-e-gateways.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
