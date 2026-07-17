# Admin Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every data-driven admin read and write on EU ingress to RU runtime so the admin UI and live bot use the same production records.

**Architecture:** Keep EU as the public admin shell and move each admin domain to the existing internal bridge pattern: RU-owned service layer, RU internal admin API, and EU ingress bridge client plus page/action switch. Roll out by domain batches so every batch has its own test loop and can stop safely on the first mismatch.

**Tech Stack:** Next.js App Router, server actions, Prisma, internal authenticated HTTP bridge, Vitest, TypeScript

## Global Constraints

- EU ingress must never silently fall back to local Prisma for migrated domains.
- RU runtime remains the only live source of truth for admin-controlled data.
- Reads and writes for a migrated domain must cut over together.
- Existing old EU-local data may remain present, but it is no longer authoritative.
- Keep admin browser auth on EU in this stage.
- Reuse the existing `users` bridge pattern as the reference implementation.
- Prefer domain services under `src/features/admin/<domain>/`.
- Add internal admin endpoints under `src/app/api/internal/admin/`.
- Preserve RU/local-development direct-service execution when `APP_ROLE !== "ingress"`.

---

## File Structure

### Existing reference files

- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/users/service.ts`
  - Reference service-layer shape for list/detail/mutations
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/users/internal-admin-client.ts`
  - Reference bridge client shape and ingress gate
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/users/route.ts`
  - Reference read endpoint
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/users/[userId]/route.ts`
  - Reference detail endpoint
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/users/actions/route.ts`
  - Reference mutation endpoint

### New domain modules to add

- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/shared/internal-admin-client.ts`
  - Shared bridge primitives reused by all domains
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/funnel/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/funnel/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/chat-bot/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/chat-bot/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/photo-styles/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/photo-styles/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/prompts/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/prompts/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/triggers/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/triggers/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/groups/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/groups/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/tariffs/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/tariffs/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/settings/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/settings/internal-admin-client.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/dashboard/service.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/dashboard/internal-admin-client.ts`

### New internal API route groups to add

- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/funnel/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/funnel/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/chat-bot/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/chat-bot/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/photo-styles/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/photo-styles/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/prompts/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/prompts/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/triggers/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/triggers/[triggerId]/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/triggers/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/groups/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/groups/[groupId]/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/groups/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/tariffs/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/tariffs/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/settings/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/settings/actions/route.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/dashboard/route.ts`

### Existing admin pages/actions to modify

- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/funnel/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/chat-bot/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/photo-styles/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/prompts/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/actions.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/new/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/[triggerId]/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/actions.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/[groupId]/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/actions.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/[groupId]/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/tariffs/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/settings/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/history/page.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/usage/page.tsx`

### High-risk helpers to audit and possibly modify

- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/_lib/dynamic-user-groups.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/_lib/user-groups.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/_lib/save-admin-image.ts`

### Test files to add or extend

- `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/shared/internal-admin-client.test.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/funnel/page.actions.test.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/funnel/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/chat-bot/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/photo-styles/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/prompts/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.actions.test.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/group-membership-actions.test.ts`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/tariffs/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/settings/page.test.tsx`
- `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/page.test.tsx`

## Task 1: Establish Shared Bridge Primitive and Inventory Gate

**Files:**
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/shared/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/shared/internal-admin-client.test.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/users/internal-admin-client.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/docs/superpowers/plans/2026-07-17-admin-single-source-of-truth-implementation-plan.md`

**Interfaces:**
- Consumes: `INTERNAL_API_BASE_URL`, `INTERNAL_API_SHARED_SECRET`, `APP_ROLE`
- Produces: `shouldUseInternalAdminBridge(): boolean`, `fetchInternalAdminJson<T>(path: string, init?: RequestInit): Promise<T>`

- [x] **Step 1: Write the failing shared-bridge test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchInternalAdminJson, shouldUseInternalAdminBridge } from "./internal-admin-client";

describe("admin shared internal bridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  });

  it("reports bridge enabled only for ingress with config", () => {
    expect(shouldUseInternalAdminBridge()).toBe(true);
    delete process.env.INTERNAL_API_BASE_URL;
    expect(shouldUseInternalAdminBridge()).toBe(false);
  });

  it("sends authenticated json requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchInternalAdminJson("/api/internal/admin/funnel");

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/internal/admin/funnel", "http://10.10.0.1:3000"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-internal-shared-secret": "shared-secret",
        }),
      }),
    );
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/admin/shared/internal-admin-client.test.ts`

Expected: FAIL with module not found for `src/features/admin/shared/internal-admin-client.ts`

- [x] **Step 3: Write minimal shared bridge implementation**

```ts
import { INTERNAL_AUTH_HEADER } from "@/lib/internal-service-auth";

function getInternalAdminBaseUrl() {
  const baseUrl = process.env.INTERNAL_API_BASE_URL;
  const secret = process.env.INTERNAL_API_SHARED_SECRET;

  if (!baseUrl || !secret) {
    return null;
  }

  return { baseUrl, secret };
}

export function shouldUseInternalAdminBridge() {
  return process.env.APP_ROLE === "ingress" && getInternalAdminBaseUrl() !== null;
}

export async function fetchInternalAdminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getInternalAdminBaseUrl();

  if (!config) {
    throw new Error("Internal admin bridge is not configured");
  }

  const response = await fetch(new URL(path, config.baseUrl), {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      [INTERNAL_AUTH_HEADER]: config.secret,
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Internal admin bridge request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

- [x] **Step 4: Refactor users bridge onto the shared primitive**

```ts
import { fetchInternalAdminJson, shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

function reviveUserTariff<T extends { expiresAt: string } | null>(value: T) {
  if (!value) return null;
  return { ...value, expiresAt: new Date(value.expiresAt) };
}
```

- [x] **Step 5: Run tests to verify the shared primitive passes**

Run: `npm run test -- src/features/admin/shared/internal-admin-client.test.ts src/app/admin/users/user-groups-actions.test.ts src/app/admin/users/page.test.tsx src/app/admin/users/[userId]/page.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/shared/internal-admin-client.ts src/features/admin/shared/internal-admin-client.test.ts src/features/admin/users/internal-admin-client.ts src/app/admin/users/actions.ts src/app/admin/users/page.tsx src/app/admin/users/[userId]/page.tsx
git commit -m "refactor: share admin internal bridge primitives"
```

## Task 2: Migrate Funnel and Onboarding Admin to RU

**Files:**
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/funnel/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/funnel/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/funnel/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/funnel/actions/route.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/funnel/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/funnel/page.actions.test.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/funnel/page.test.tsx`

**Interfaces:**
- Consumes: `fetchInternalAdminJson`, `shouldUseInternalAdminBridge`, `saveAdminImage`
- Produces: `loadAdminFunnelPageData(): Promise<{ steps: FunnelAdminStep[] }>`, `performCreateFunnelStep(input: FunnelMutationInput): Promise<void>`, `performUpdateFunnelStep(input: FunnelMutationInput & { id: string }): Promise<void>`

- [ ] **Step 1: Write failing tests for ingress-based funnel reads and mutations**

```ts
it("loads funnel steps from the internal bridge on ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      steps: [{
        id: "step_1",
        slug: "welcome",
        title: "Приветствие",
        text: "Текст шага",
        imagePath: "/onboarding/1.jpg",
        sortOrder: 0,
        active: true,
        nextButtonText: "Далее",
        nextAction: "next",
        offerButtonText: null,
        buyButtons: [],
        buyButtonText: "",
        buyButtonUrl: null,
      }],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);

  const html = renderToStaticMarkup(await AdminFunnelPage());
  expect(html).toContain("Приветствие");
  expect(fetchMock).toHaveBeenCalled();
});

it("posts funnel updates to RU on ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);

  const formData = new FormData();
  formData.set("id", "step_1");
  formData.set("sortOrder", "0");
  formData.set("title", "Приветствие");
  formData.set("imagePath", "/onboarding/1.jpg");
  formData.set("text", "Текст шага");
  formData.set("nextButtonText", "Далее");
  formData.set("nextAction", "next");

  await updateFunnelStep(formData);

  expect(fetchMock).toHaveBeenCalledWith(
    new URL("/api/internal/admin/funnel/actions", "http://10.10.0.1:3000"),
    expect.objectContaining({ method: "POST" }),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx`

Expected: FAIL because `/admin/funnel` still reads and writes local Prisma on ingress

- [ ] **Step 3: Implement funnel service, internal endpoints, and ingress switch**

```ts
export async function loadAdminFunnelPageData() {
  return {
    steps: await prisma.funnelStep.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        active: true,
        buyButtons: true,
        buyButtonText: true,
        buyButtonUrl: true,
        id: true,
        imagePath: true,
        nextButtonText: true,
        nextAction: true,
        offerButtonText: true,
        slug: true,
        sortOrder: true,
        text: true,
        title: true,
      },
    }),
  };
}

export async function performUpdateFunnelStep(input: FunnelMutationInput & { id: string }) {
  await prisma.funnelStep.update({
    where: { id: input.id },
    data: {
      active: input.active,
      buyButtons: input.buyButtons,
      buyButtonText: input.firstBuyButton?.text ?? "",
      buyButtonUrl: input.firstBuyButton?.url || null,
      imagePath: input.imagePath,
      nextButtonText: input.nextButtonText,
      nextAction: input.nextAction,
      offerButtonText: input.offerButtonText || null,
      sortOrder: input.sortOrder,
      text: input.text,
      title: input.title,
    },
  });
}
```

- [ ] **Step 4: Ensure no ingress fallback to local Prisma remains in funnel page**

```ts
const { steps } = shouldUseInternalAdminBridge()
  ? await fetchInternalAdminFunnelPageData()
  : await loadAdminFunnelPageData();
```

- [ ] **Step 5: Run tests and verify onboarding alignment logic still passes**

Run: `npm run test -- src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/bot/onboarding.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/funnel src/app/api/internal/admin/funnel src/app/admin/funnel/page.tsx src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx
git commit -m "feat: bridge funnel admin to ru runtime"
```

## Task 3: Migrate Chat Bot, Photo Styles, and Prompts Admin Batch

**Files:**
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/chat-bot/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/chat-bot/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/photo-styles/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/photo-styles/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/prompts/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/prompts/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/chat-bot/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/chat-bot/actions/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/photo-styles/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/photo-styles/actions/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/prompts/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/prompts/actions/route.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/chat-bot/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/photo-styles/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/prompts/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/delete-actions.test.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/photo-styles/page.test.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/chat-bot/page.test.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/prompts/page.test.tsx`

**Interfaces:**
- Consumes: shared bridge primitive, `saveAdminImage`
- Produces: `loadAdminChatBotPageData()`, `performCreateBotMenuButton()`, `performUpdateBotMenuButton()`, `performDeleteBotMenuButton()`, `performUpdateMenuIntro()`, `loadAdminPhotoStylesPageData()`, `performCreatePhotoStyle()`, `performUpdatePhotoStyle()`, `performDeletePhotoStyle()`, `loadAdminPromptsPageData()`, `performUpdatePrompt()`

- [ ] **Step 1: Add failing ingress tests for each domain**

```ts
it("reads photo styles from RU when running as ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ styles: [{ id: "style_1", name: "Soft Box", description: "desc", prompt: "prompt", preview: null, userPreview: null, userText: null, provider: "openai", model: "gpt-image-1", active: true, createdAt: new Date().toISOString() }] }),
  }));

  const html = renderToStaticMarkup(await PhotoStylesPage());
  expect(html).toContain("Soft Box");
});

it("posts prompt updates to RU when running as ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);

  const formData = new FormData();
  formData.set("id", "prompt_1");
  formData.set("title", "Recipe");
  formData.set("slug", "recipe");
  formData.set("feature", "recipe-card");
  formData.set("systemPrompt", "sys");
  formData.set("userTemplate", "user");
  formData.set("model", "gpt-4.1");
  formData.set("temperature", "0.4");
  formData.set("provider", "openai");
  formData.set("active", "on");

  await updatePrompt(formData);

  expect(fetchMock).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify ingress cases fail**

Run: `npm run test -- src/app/admin/chat-bot/page.test.tsx src/app/admin/photo-styles/page.test.tsx src/app/admin/prompts/page.test.tsx src/app/admin/delete-actions.test.ts`

Expected: FAIL because the pages and actions still call local Prisma

- [ ] **Step 3: Implement domain services and internal API routes**

```ts
export async function loadAdminPhotoStylesPageData() {
  return {
    styles: await prisma.photoStyle.findMany({
      orderBy: { createdAt: "desc" },
    }),
  };
}

export async function performDeletePhotoStyle(id: string) {
  await prisma.photoStyle.delete({ where: { id } });
}

export async function loadAdminPromptsPageData() {
  return {
    prompts: await prisma.prompt.findMany({
      orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
    }),
  };
}
```

- [ ] **Step 4: Switch admin pages and actions to ingress-aware bridge calls**

```ts
const { styles } = shouldUseInternalAdminBridge()
  ? await fetchInternalAdminPhotoStylesPageData()
  : await loadAdminPhotoStylesPageData();

if (shouldUseInternalAdminBridge()) {
  await postInternalAdminPhotoStyleAction("deletePhotoStyle", { id });
} else {
  await performDeletePhotoStyle(id);
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/app/admin/chat-bot/page.test.tsx src/app/admin/photo-styles/page.test.tsx src/app/admin/prompts/page.test.tsx src/app/admin/delete-actions.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/chat-bot src/features/admin/photo-styles src/features/admin/prompts src/app/api/internal/admin/chat-bot src/app/api/internal/admin/photo-styles src/app/api/internal/admin/prompts src/app/admin/chat-bot/page.tsx src/app/admin/photo-styles/page.tsx src/app/admin/prompts/page.tsx src/app/admin/delete-actions.test.ts
git commit -m "feat: bridge content admin domains to ru runtime"
```

## Task 4: Migrate Triggers Admin Batch Including Test Send

**Files:**
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/triggers/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/triggers/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/triggers/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/triggers/[triggerId]/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/triggers/actions/route.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/actions.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/new/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/[triggerId]/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.actions.test.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/triggers/page.test.tsx`

**Interfaces:**
- Consumes: shared bridge primitive, trigger parsing helpers, `saveAdminImage`
- Produces: `loadAdminTriggersPageData()`, `loadAdminTriggerEditorData(triggerId?: string)`, `performCreateTriggerRule()`, `performUpdateTriggerRule()`, `performDeleteTriggerRule()`, `performSendTriggerTest()`

- [ ] **Step 1: Write failing tests for ingress-trigger reads and test send**

```ts
it("loads trigger list from RU on ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ rules: [], groups: [] }),
  }));

  await TriggersPage({ searchParams: Promise.resolve({}) });
  expect(fetch).toHaveBeenCalled();
});

it("routes trigger test-send through RU on ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok", recipients: 1 }) });
  vi.stubGlobal("fetch", fetchMock);

  const formData = new FormData();
  formData.set("messageText", "<b>Hi</b>");

  await sendTriggerTestMessage(formData);

  expect(fetchMock).toHaveBeenCalledWith(
    new URL("/api/internal/admin/triggers/actions", "http://10.10.0.1:3000"),
    expect.objectContaining({ method: "POST" }),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx`

Expected: FAIL because trigger pages and actions still read/write local Prisma

- [ ] **Step 3: Implement trigger service and RU internal APIs**

```ts
export async function loadAdminTriggersPageData() {
  const [rules, groups] = await Promise.all([
    prisma.triggerRule.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.userGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { rules, groups };
}

export async function performDeleteTriggerRule(id: string) {
  await prisma.triggerRule.delete({ where: { id } });
}
```

- [ ] **Step 4: Switch list, editor, and server actions to ingress-aware bridge calls**

```ts
if (shouldUseInternalAdminBridge()) {
  return postInternalAdminTriggerAction("sendTriggerTest", payload);
}

return performSendTriggerTest(payload);
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/triggers src/app/api/internal/admin/triggers src/app/admin/triggers/actions.ts src/app/admin/triggers/page.tsx src/app/admin/triggers/new/page.tsx src/app/admin/triggers/[triggerId]/page.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx
git commit -m "feat: bridge triggers admin to ru runtime"
```

## Task 5: Migrate Groups and Tariffs Admin Batch

**Files:**
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/groups/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/groups/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/tariffs/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/tariffs/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/groups/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/groups/[groupId]/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/groups/actions/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/tariffs/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/tariffs/actions/route.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/actions.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/[groupId]/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/actions.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/[groupId]/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/tariffs/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/group-membership-actions.test.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/user-groups/page.test.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/dynamic-user-groups/page.test.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/tariffs/page.test.tsx`

**Interfaces:**
- Consumes: shared bridge primitive
- Produces: `loadAdminUserGroupsPageData()`, `loadAdminUserGroupDetailPageData(groupId: string)`, `loadAdminDynamicGroupsPageData()`, `loadAdminDynamicGroupDetailPageData(groupId: string)`, `loadAdminTariffsPageData()`, group and tariff mutation action dispatchers

- [ ] **Step 1: Add failing ingress tests**

```ts
it("reads user groups from RU on ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ groups: [{ id: "group_1", name: "Админы", description: null, createdAt: new Date().toISOString(), membersCount: 1 }] }),
  }));

  const html = renderToStaticMarkup(await UserGroupsPage());
  expect(html).toContain("Админы");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/app/admin/user-groups/group-membership-actions.test.ts src/app/admin/user-groups/page.test.tsx src/app/admin/dynamic-user-groups/page.test.tsx src/app/admin/tariffs/page.test.tsx`

Expected: FAIL because pages and actions still call local Prisma

- [ ] **Step 3: Implement groups/tariffs services and internal endpoints**

```ts
export async function loadAdminTariffsPageData() {
  return {
    tariffs: await prisma.tariffPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  };
}

export async function performCreateUserGroup(input: { name: string; description: string }) {
  await prisma.userGroup.create({
    data: {
      name: input.name,
      description: input.description || null,
    },
  });
}
```

- [ ] **Step 4: Switch EU actions/pages to internal bridge**

```ts
if (shouldUseInternalAdminBridge()) {
  await postInternalAdminGroupAction("createUserGroup", { name, description });
} else {
  await performCreateUserGroup({ name, description });
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/app/admin/user-groups/group-membership-actions.test.ts src/app/admin/user-groups/page.test.tsx src/app/admin/dynamic-user-groups/page.test.tsx src/app/admin/tariffs/page.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/groups src/features/admin/tariffs src/app/api/internal/admin/groups src/app/api/internal/admin/tariffs src/app/admin/user-groups src/app/admin/dynamic-user-groups src/app/admin/tariffs/page.tsx
git commit -m "feat: bridge groups and tariffs admin to ru runtime"
```

## Task 6: Migrate Settings and Dashboard/Reporting Reads

**Files:**
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/settings/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/settings/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/dashboard/service.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/features/admin/dashboard/internal-admin-client.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/settings/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/settings/actions/route.ts`
- Create: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/api/internal/admin/dashboard/route.ts`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/settings/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/history/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/usage/page.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/settings/page.test.tsx`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/src/app/admin/page.test.tsx`

**Interfaces:**
- Consumes: shared bridge primitive
- Produces: `loadAdminSettingsPageData()`, `performSaveApiSecret()`, `performClearApiSecret()`, `loadAdminDashboardPageData()`, `loadAdminHistoryPageData()`, `loadAdminUsagePageData()`

- [ ] **Step 1: Add failing ingress tests for settings and dashboard**

```ts
it("loads stored secrets from RU on ingress", async () => {
  process.env.APP_ROLE = "ingress";
  process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
  process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ dbStatus: "ok", storedSecrets: [{ key: "OPENAI_API_KEY", valuePreview: "sk-...1234", updatedAt: new Date().toISOString() }] }),
  }));

  const html = renderToStaticMarkup(await SettingsPage());
  expect(html).toContain("OPENAI_API_KEY");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/app/admin/settings/page.test.tsx src/app/admin/page.test.tsx`

Expected: FAIL because settings/dashboard still read local Prisma

- [ ] **Step 3: Implement settings and dashboard read services plus internal routes**

```ts
export async function loadAdminSettingsPageData() {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  return {
    dbStatus,
    storedSecrets: await prisma.apiSecret.findMany({
      orderBy: { updatedAt: "desc" },
      select: { key: true, valuePreview: true, updatedAt: true },
    }),
  };
}
```

- [ ] **Step 4: Switch ingress pages/actions to bridge-backed data**

```ts
const { dbStatus, storedSecrets } = shouldUseInternalAdminBridge()
  ? await fetchInternalAdminSettingsPageData()
  : await loadAdminSettingsPageData();
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/app/admin/settings/page.test.tsx src/app/admin/page.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/settings src/features/admin/dashboard src/app/api/internal/admin/settings src/app/api/internal/admin/dashboard src/app/admin/settings/page.tsx src/app/admin/page.tsx src/app/admin/history/page.tsx src/app/admin/usage/page.tsx src/app/admin/settings/page.test.tsx src/app/admin/page.test.tsx
git commit -m "feat: bridge settings and reporting admin to ru runtime"
```

## Task 7: Full Verification, Deployment, and Cleanup Gate

**Files:**
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/docs/superpowers/plans/2026-07-17-admin-single-source-of-truth-implementation-plan.md`
- Modify: `C:/Users/Roof/Documents/Телега/pastry-ai/docs/superpowers/specs/2026-07-17-admin-single-source-of-truth-design.md`

**Interfaces:**
- Consumes: all prior domain bridge modules and tests
- Produces: verification evidence, deployment checklist, follow-up cleanup backlog

- [ ] **Step 1: Run the full admin bridge test suite**

Run:

```bash
npm run test -- src/features/admin/shared/internal-admin-client.test.ts src/app/admin/users/user-groups-actions.test.ts src/app/admin/users/page.test.tsx src/app/admin/users/[userId]/page.test.tsx src/app/admin/funnel/page.actions.test.ts src/app/admin/funnel/page.test.tsx src/app/admin/chat-bot/page.test.tsx src/app/admin/photo-styles/page.test.tsx src/app/admin/prompts/page.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx src/app/admin/user-groups/group-membership-actions.test.ts src/app/admin/user-groups/page.test.tsx src/app/admin/dynamic-user-groups/page.test.tsx src/app/admin/tariffs/page.test.tsx src/app/admin/settings/page.test.tsx src/app/admin/page.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: Execute live ingress verification script manually**

```text
1. Open EU `/admin/users`, `/admin/funnel`, `/admin/chat-bot`, `/admin/photo-styles`, `/admin/prompts`, `/admin/triggers`, `/admin/user-groups`, `/admin/dynamic-user-groups`, `/admin/tariffs`, `/admin/settings`.
2. Confirm each page loads live RU-backed data.
3. Perform one mutation per domain from EU admin.
4. Confirm the same mutation is visible after reload.
5. Confirm runtime-facing domains affect live bot behavior where applicable.
```

- [ ] **Step 4: Deploy RU and EU together**

Run:

```bash
docker compose -f deploy/ru/docker-compose.yml up -d --build
docker compose -f deploy/eu-gateway/docker-compose.yml up -d --build
```

Expected: both stacks rebuild successfully with new internal admin endpoints available

- [ ] **Step 5: Record post-cutover cleanup backlog**

```text
- enumerate dead EU-local Prisma admin paths
- decide whether to keep or retire legacy admin helper loaders
- plan separate destructive cleanup for old EU-local state only after stable observation
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: verify full admin bridge rollout"
```

## Self-Review

### Spec coverage

- Single-source RU authority: covered by Tasks 1-6 domain cutovers.
- No ingress fallback to local Prisma: enforced in Tasks 2-6 switch steps.
- Full data-driven admin coverage: split across funnel, content, triggers, groups, tariffs, settings, dashboard, and existing users reference.
- Runtime alignment checks: covered in Task 7 verification.
- Keep EU auth and shell: preserved by architecture and no task replaces admin browser auth.

### Placeholder scan

- No `TODO` or `TBD` placeholders remain.
- Every task includes explicit files, interfaces, commands, and expected outputs.
- Every mutation/read cutover is tied to a concrete domain batch.

### Type consistency

- Shared bridge names are normalized around `shouldUseInternalAdminBridge` and `fetchInternalAdminJson`.
- Domain data loaders follow `loadAdmin<Domain>PageData` naming.
- Mutation executors follow `perform<Verb><Domain>` naming.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-17-admin-single-source-of-truth-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
