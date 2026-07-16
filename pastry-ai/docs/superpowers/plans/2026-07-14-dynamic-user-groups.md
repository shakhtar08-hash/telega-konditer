# Dynamic User Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build virtual dynamic user groups with a flat condition builder, live preview, `/admin/users` filtering, and trigger-rule reuse.

**Architecture:** Add a new `DynamicUserGroup` Prisma model plus a focused dynamic-group feature module that owns rule typing, validation, evaluation, and query-assisted previewing. Reuse that module from the new admin pages, the users list filter, and the trigger condition pipeline so dynamic groups stay virtual and are evaluated from live user state instead of stored memberships.

**Tech Stack:** Next.js App Router, React client/server components, TypeScript, Prisma, PostgreSQL, Vitest

## Global Constraints

- No materialized membership table for dynamic groups.
- No background sync or cron-based recomputation.
- No exporting a dynamic group into a manual group.
- No dynamic-group-to-dynamic-group references.
- No nested logical trees or grouped parentheses in the first release.
- No bulk actions over dynamic-group result sets in the first release.
- No historical audit of segment membership changes.
- only flat condition lists
- only one top-level logical operator
- no nested condition groups
- no stored memberships
- no snapshot/export into manual groups
- no bulk operations on matching users
- no historical segment diffing
- no automatic trigger-side caching layer
- manual and dynamic groups remain clearly separated in admin language and behavior

---

## File Structure

- Create: `prisma/migrations/<timestamp>_dynamic_user_groups/migration.sql`
  Adds the `DynamicUserGroup` table and supporting indexes.
- Modify: `prisma/schema.prisma`
  Declares the new Prisma model and any relations or indexes.
- Create: `src/features/dynamic-user-groups/rule-types.ts`
  Owns dynamic group condition types, operator sets, and type guards.
- Create: `src/features/dynamic-user-groups/rule-validator.ts`
  Validates `conditionsJson` payloads into normalized runtime definitions.
- Create: `src/features/dynamic-user-groups/evaluator.ts`
  Evaluates one user context against one dynamic-group definition.
- Create: `src/features/dynamic-user-groups/query.ts`
  Builds query-assisted preview filters and preview list loading.
- Create: `src/features/dynamic-user-groups/service.ts`
  High-level helpers to list groups, load one group, preview count, preview users, and resolve trigger checks.
- Create: `src/features/dynamic-user-groups/*.test.ts`
  Covers validator, evaluator, and service behavior.
- Create: `src/app/admin/dynamic-user-groups/actions.ts`
  Server actions for create, update, delete, and status changes.
- Create: `src/app/admin/dynamic-user-groups/page.tsx`
  Dynamic-group index page.
- Create: `src/app/admin/dynamic-user-groups/page.test.tsx`
  Index page rendering coverage.
- Create: `src/app/admin/dynamic-user-groups/[groupId]/page.tsx`
  Dynamic-group editor and preview workspace.
- Create: `src/app/admin/dynamic-user-groups/[groupId]/page.test.tsx`
  Workspace page coverage.
- Create: `src/app/admin/dynamic-user-groups/dynamic-group-form.tsx`
  Client-side flat condition builder with `AND` / `OR`.
- Create: `src/app/admin/dynamic-user-groups/dynamic-group-form.test.tsx`
  Builder serialization and summary coverage.
- Modify: `src/app/admin/sidebar.tsx`
  Adds navigation entry for dynamic groups.
- Modify: `src/app/admin/admin-pages.test.ts`
  Asserts the route is discoverable in admin navigation.
- Modify: `src/app/admin/users/page.tsx`
  Adds dynamic-group filter and applies query/live preview results.
- Modify: `src/app/admin/users/[userId]/page.tsx`
  Optionally surfaces matching dynamic groups for the current user if the page layout allows it without clutter.
- Create: `src/app/admin/_lib/dynamic-user-groups.ts`
  Shared admin-safe loaders and graceful empty-state handling.
- Modify: `src/features/triggers/trigger-rule-types.ts`
  Adds `dynamicUserGroupId` condition and extends trigger user state if needed.
- Modify: `src/features/triggers/trigger-condition.ts`
  Evaluates manual conditions plus dynamic-group conditions via the feature service.
- Modify: `src/features/triggers/trigger-service.ts`
  Threads dynamic-group lookups into trigger execution.
- Modify: `src/features/triggers/trigger-service.test.ts`
  Verifies trigger delivery respects dynamic groups.
- Modify: `src/app/admin/triggers/actions.ts`
  Accepts and normalizes dynamic-group conditions from form payloads.
- Modify: `src/app/admin/triggers/page.tsx`
  Resolves dynamic-group labels in trigger summaries.
- Modify: `src/app/admin/triggers/trigger-form.tsx`
  Adds dynamic-group option rows in the trigger builder.
- Modify: `src/app/admin/triggers/trigger-form.test.tsx`
  Covers draft conversion, preview text, and serialization.
- Modify: `src/app/admin/triggers/page.actions.test.ts`
  Covers server-side condition normalization.
- Modify: `src/app/admin/triggers/page.test.tsx`
  Covers summaries with dynamic-group labels.

### Task 1: Persist Dynamic Group Definitions

**Files:**
- Create: `prisma/migrations/<timestamp>_dynamic_user_groups/migration.sql`
- Modify: `prisma/schema.prisma`
- Create: `src/features/dynamic-user-groups/rule-types.ts`
- Create: `src/features/dynamic-user-groups/rule-validator.ts`
- Test: `src/features/dynamic-user-groups/rule-validator.test.ts`

**Interfaces:**
- Consumes: existing Prisma `User`, `UserTariff`, `TokenUsage`, and `UserGroup` models
- Produces: `DynamicUserGroupDefinition`, `DynamicGroupCondition`, `parseDynamicUserGroupDefinition(input: unknown): DynamicUserGroupDefinition | null`

- [ ] **Step 1: Write the failing validator tests**

```ts
import { describe, expect, it } from "vitest";
import { parseDynamicUserGroupDefinition } from "./rule-validator";

describe("parseDynamicUserGroupDefinition", () => {
  it("accepts a flat AND definition with supported conditions", () => {
    expect(
      parseDynamicUserGroupDefinition({
        logicOperator: "AND",
        conditions: [
          { field: "promoClaimed", operator: "is", value: true },
          { field: "generationCount", operator: "gte", value: 3 },
          { field: "daysSinceSignup", operator: "lte", value: 30 },
        ],
      }),
    ).toEqual({
      logicOperator: "AND",
      conditions: [
        { field: "promoClaimed", operator: "is", value: true },
        { field: "generationCount", operator: "gte", value: 3 },
        { field: "daysSinceSignup", operator: "lte", value: 30 },
      ],
    });
  });

  it("rejects unsupported references to manual groups", () => {
    expect(
      parseDynamicUserGroupDefinition({
        logicOperator: "OR",
        conditions: [{ field: "manualGroupId", operator: "isMember", value: "vip" }],
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/dynamic-user-groups/rule-validator.test.ts`
Expected: FAIL with module-not-found or missing export errors for the new dynamic-group files.

- [ ] **Step 3: Add the Prisma model and runtime types**

```prisma
model DynamicUserGroup {
  id            String   @id @default(cuid())
  name          String
  description   String?
  status        String   @default("active")
  logicOperator String
  conditionsJson Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([name])
  @@index([status, updatedAt])
}
```

```ts
export type DynamicGroupCondition =
  | { field: "promoClaimed"; operator: "is" | "isNot"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is" | "isNot"; value: boolean }
  | { field: "tariffExpired"; operator: "is" | "isNot"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte" | "lte"; value: number }
  | { field: "daysSinceLastActivity"; operator: "gte" | "lte"; value: number }
  | { field: "daysSinceSignup"; operator: "gte" | "lte"; value: number }
  | { field: "remainingTokens"; operator: "equals" | "gte" | "lte"; value: number };

export type DynamicUserGroupDefinition = {
  logicOperator: "AND" | "OR";
  conditions: DynamicGroupCondition[];
};
```

```ts
export function parseDynamicUserGroupDefinition(input: unknown): DynamicUserGroupDefinition | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const logicOperator = record.logicOperator === "OR" ? "OR" : record.logicOperator === "AND" ? "AND" : null;
  const conditions = Array.isArray(record.conditions) ? record.conditions : null;

  if (!logicOperator || !conditions || conditions.length === 0) {
    return null;
  }

  const parsedConditions = conditions.flatMap((condition) => {
    if (!condition || typeof condition !== "object") {
      return [];
    }

    const draft = condition as Record<string, unknown>;

    switch (draft.field) {
      case "promoClaimed":
      case "hasActiveTariff":
      case "tariffExpired":
        return (draft.operator === "is" || draft.operator === "isNot") && typeof draft.value === "boolean"
          ? [{ field: draft.field, operator: draft.operator, value: draft.value }]
          : [];
      case "generationCount":
      case "daysSinceLastActivity":
      case "daysSinceSignup":
      case "remainingTokens":
        return (draft.operator === "equals" || draft.operator === "gte" || draft.operator === "lte") &&
          typeof draft.value === "number" &&
          Number.isFinite(draft.value)
          ? [{ field: draft.field, operator: draft.operator, value: draft.value }]
          : [];
      default:
        return [];
    }
  });

  return parsedConditions.length === conditions.length
    ? { logicOperator, conditions: parsedConditions }
    : null;
}
```

- [ ] **Step 4: Create the migration and re-generate Prisma artifacts**

Run: `npx prisma migrate dev --name dynamic_user_groups`
Expected: PASS with a new migration folder and an updated Prisma client.

- [ ] **Step 5: Run the validator test and schema checks**

Run: `npm test -- src/features/dynamic-user-groups/rule-validator.test.ts`
Expected: PASS

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/features/dynamic-user-groups/rule-types.ts src/features/dynamic-user-groups/rule-validator.ts src/features/dynamic-user-groups/rule-validator.test.ts
git commit -m "feat: add dynamic user group schema"
```

### Task 2: Build Live Evaluation and Preview Services

**Files:**
- Create: `src/features/dynamic-user-groups/evaluator.ts`
- Create: `src/features/dynamic-user-groups/query.ts`
- Create: `src/features/dynamic-user-groups/service.ts`
- Create: `src/features/dynamic-user-groups/evaluator.test.ts`
- Create: `src/features/dynamic-user-groups/service.test.ts`
- Modify: `src/features/triggers/trigger-user-state.ts`

**Interfaces:**
- Consumes: `DynamicUserGroupDefinition`, Prisma client, `TriggerUserState`
- Produces: `matchesDynamicUserGroup(definition, context): boolean`, `countDynamicUserGroupMatches(groupId): Promise<number>`, `listDynamicUserGroupPreviewUsers(groupId, page): Promise<PreviewUser[]>`

- [ ] **Step 1: Write failing evaluator and service tests**

```ts
import { describe, expect, it } from "vitest";
import { matchesDynamicUserGroup } from "./evaluator";

describe("matchesDynamicUserGroup", () => {
  it("requires every condition for AND groups", () => {
    expect(
      matchesDynamicUserGroup(
        {
          logicOperator: "AND",
          conditions: [
            { field: "promoClaimed", operator: "is", value: true },
            { field: "generationCount", operator: "gte", value: 2 },
          ],
        },
        {
          promoClaimed: true,
          hasActiveTariff: false,
          tariffExpired: true,
          generationCount: 4,
          daysSinceLastActivity: 7,
          daysSinceSignup: 12,
          remainingTokens: 0,
        },
      ),
    ).toBe(true);
  });

  it("supports negative boolean conditions", () => {
    expect(
      matchesDynamicUserGroup(
        {
          logicOperator: "AND",
          conditions: [{ field: "hasActiveTariff", operator: "isNot", value: true }],
        },
        {
          promoClaimed: false,
          hasActiveTariff: false,
          tariffExpired: true,
          generationCount: 0,
          daysSinceLastActivity: 2,
          daysSinceSignup: 20,
          remainingTokens: 0,
        },
      ),
    ).toBe(true);
  });
});
```

```ts
import { describe, expect, it, vi } from "vitest";
import { countDynamicUserGroupMatches } from "./service";

vi.mock("@/db/prisma", () => ({
  prisma: {
    dynamicUserGroup: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe("countDynamicUserGroupMatches", () => {
  it("returns a live count for an active group", async () => {
    await expect(countDynamicUserGroupMatches("group_live")).resolves.toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/dynamic-user-groups/evaluator.test.ts src/features/dynamic-user-groups/service.test.ts`
Expected: FAIL because the evaluator and service do not exist yet.

- [ ] **Step 3: Implement the evaluator and preview loaders**

```ts
export type DynamicGroupEvaluationContext = {
  promoClaimed: boolean;
  hasActiveTariff: boolean;
  tariffExpired: boolean;
  generationCount: number;
  daysSinceLastActivity: number | null;
  daysSinceSignup: number;
  remainingTokens: number;
};

export function matchesDynamicUserGroup(
  definition: DynamicUserGroupDefinition,
  context: DynamicGroupEvaluationContext,
): boolean {
  const evaluate = (condition: DynamicGroupCondition) => {
    switch (condition.field) {
      case "promoClaimed":
      case "hasActiveTariff":
      case "tariffExpired": {
        const actual = context[condition.field];
        return condition.operator === "is" ? actual === condition.value : actual !== condition.value;
      }
      case "generationCount":
      case "daysSinceSignup":
      case "remainingTokens": {
        const actual = context[condition.field];
        return condition.operator === "equals"
          ? actual === condition.value
          : condition.operator === "gte"
            ? actual >= condition.value
            : actual <= condition.value;
      }
      case "daysSinceLastActivity": {
        if (context.daysSinceLastActivity === null) {
          return false;
        }
        return condition.operator === "gte"
          ? context.daysSinceLastActivity >= condition.value
          : context.daysSinceLastActivity <= condition.value;
      }
    }
  };

  return definition.logicOperator === "AND"
    ? definition.conditions.every(evaluate)
    : definition.conditions.some(evaluate);
}
```

```ts
export async function countDynamicUserGroupMatches(groupId: string) {
  const preview = await buildDynamicUserGroupPreview(groupId, { take: 500 });
  return preview.total;
}
```

```ts
export async function listDynamicUserGroupPreviewUsers(groupId: string, page = 1) {
  return buildDynamicUserGroupPreview(groupId, {
    skip: (page - 1) * 25,
    take: 25,
  });
}
```

- [ ] **Step 4: Extend trigger user-state loading for shared live fields**

```ts
export type TriggerUserState = {
  plan: string;
  promoClaimed: boolean;
  hasActiveTariff: boolean;
  generationCount: number;
  groupIds: string[];
  remainingTokens: number;
  tariffExpired: boolean;
  createdAt: Date;
  lastActivityAt: Date | null;
};
```

- [ ] **Step 5: Run the new test suite**

Run: `npm test -- src/features/dynamic-user-groups/evaluator.test.ts src/features/dynamic-user-groups/service.test.ts src/features/triggers/trigger-user-state.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/dynamic-user-groups src/features/triggers/trigger-user-state.ts src/features/triggers/trigger-user-state.test.ts
git commit -m "feat: add dynamic group evaluation service"
```

### Task 3: Add the Dynamic Groups Admin Area

**Files:**
- Create: `src/app/admin/_lib/dynamic-user-groups.ts`
- Create: `src/app/admin/dynamic-user-groups/actions.ts`
- Create: `src/app/admin/dynamic-user-groups/page.tsx`
- Create: `src/app/admin/dynamic-user-groups/page.test.tsx`
- Create: `src/app/admin/dynamic-user-groups/[groupId]/page.tsx`
- Create: `src/app/admin/dynamic-user-groups/[groupId]/page.test.tsx`
- Create: `src/app/admin/dynamic-user-groups/dynamic-group-form.tsx`
- Create: `src/app/admin/dynamic-user-groups/dynamic-group-form.test.tsx`
- Modify: `src/app/admin/sidebar.tsx`
- Modify: `src/app/admin/admin-pages.test.ts`

**Interfaces:**
- Consumes: dynamic-group service helpers from Task 2
- Produces: admin CRUD forms posting `name`, `description`, `status`, `logicOperator`, and `conditions`

- [ ] **Step 1: Write failing UI tests for the new admin pages**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminDynamicUserGroupsPage from "./page";

vi.mock("@/db/prisma", () => ({
  prisma: {
    dynamicUserGroup: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "group_new",
          name: "Без активного тарифа",
          description: "Пользователи без оплаты",
          status: "active",
          logicOperator: "AND",
          conditionsJson: [{ field: "hasActiveTariff", operator: "is", value: false }],
          createdAt: new Date("2026-07-14T08:00:00.000Z"),
          updatedAt: new Date("2026-07-14T08:00:00.000Z"),
        },
      ]),
    },
  },
}));

describe("AdminDynamicUserGroupsPage", () => {
  it("renders the dynamic groups list", async () => {
    const html = renderToStaticMarkup(await AdminDynamicUserGroupsPage());
    expect(html).toContain("Динамические группы");
    expect(html).toContain("Без активного тарифа");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/admin/dynamic-user-groups/page.test.tsx src/app/admin/dynamic-user-groups/dynamic-group-form.test.tsx`
Expected: FAIL because the route and form are not present yet.

- [ ] **Step 3: Implement the server pages, actions, and builder**

```ts
"use server";

export async function createDynamicUserGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = formData.get("status") === "disabled" ? "disabled" : "active";
  const definition = parseDynamicUserGroupDefinition(
    JSON.parse(String(formData.get("conditions") ?? "{}")),
  );

  if (!name || !definition) {
    throw new Error("Некорректная динамическая группа");
  }

  await prisma.dynamicUserGroup.create({
    data: {
      name,
      description,
      status,
      logicOperator: definition.logicOperator,
      conditionsJson: definition.conditions,
    },
  });

  revalidatePath("/admin/dynamic-user-groups");
}
```

```tsx
<AdminPageHeader
  title="Динамические группы"
  description="Виртуальные сегменты пользователей с живым пересчётом по условиям."
/>
```

```tsx
const fieldOptions = [
  { value: "hasActiveTariff", label: "Активный тариф" },
  { value: "promoClaimed", label: "Промо получено" },
  { value: "generationCount", label: "Количество генераций" },
  { value: "daysSinceLastActivity", label: "Дней с последней активности" },
  { value: "daysSinceSignup", label: "Дней с регистрации" },
  { value: "remainingTokens", label: "Остаток токенов" },
  { value: "tariffExpired", label: "Тариф истёк" },
] as const;
```

- [ ] **Step 4: Add navigation and route coverage**

```tsx
{ href: "/admin/dynamic-user-groups", label: "Динамические группы" }
```

- [ ] **Step 5: Run the admin route test set**

Run: `npm test -- src/app/admin/dynamic-user-groups/page.test.tsx src/app/admin/dynamic-user-groups/[groupId]/page.test.tsx src/app/admin/dynamic-user-groups/dynamic-group-form.test.tsx src/app/admin/admin-pages.test.ts src/app/admin/sidebar.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/_lib/dynamic-user-groups.ts src/app/admin/dynamic-user-groups src/app/admin/sidebar.tsx src/app/admin/admin-pages.test.ts src/app/admin/sidebar.test.ts
git commit -m "feat: add dynamic user groups admin pages"
```

### Task 4: Filter the Users Admin Page by Dynamic Group

**Files:**
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/users/[userId]/page.tsx`
- Modify: `src/app/admin/users/[userId]/page.test.tsx`
- Create: `src/app/admin/users/page.test.tsx`

**Interfaces:**
- Consumes: `listDynamicUserGroupOptions()`, `listDynamicUserGroupPreviewUsers(groupId, page)`
- Produces: `/admin/users?dynamicGroupId=<id>` filter flow

- [ ] **Step 1: Write failing tests for the users filter**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminUsersPage from "./page";

vi.mock("@/features/dynamic-user-groups/service", () => ({
  listDynamicUserGroupOptions: vi.fn().mockResolvedValue([
    { value: "group_new", label: "Без активного тарифа" },
  ]),
  listDynamicUserGroupPreviewUsers: vi.fn().mockResolvedValue({
    rows: [{ id: "user_1", telegramId: "1001", username: "chef" }],
    total: 1,
  }),
}));

describe("AdminUsersPage", () => {
  it("renders a dynamic group filter", async () => {
    const html = renderToStaticMarkup(
      await AdminUsersPage({ searchParams: Promise.resolve({ dynamicGroupId: "group_new" }) } as never),
    );

    expect(html).toContain("Динамическая группа");
    expect(html).toContain("Без активного тарифа");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/admin/users/page.test.tsx`
Expected: FAIL because the users page does not accept or apply a dynamic-group filter yet.

- [ ] **Step 3: Implement the filter flow**

```tsx
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ dynamicGroupId?: string }> | { dynamicGroupId?: string };
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dynamicGroupId = resolvedSearchParams.dynamicGroupId?.trim() || "";

  const [dynamicGroupOptions, dynamicPreview, tariffPlans] = await Promise.all([
    listDynamicUserGroupOptions(),
    dynamicGroupId ? listDynamicUserGroupPreviewUsers(dynamicGroupId, 1) : null,
    prisma.tariffPlan.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  const users = dynamicPreview ? await loadUsersByIds(dynamicPreview.rows.map((user) => user.id)) : await loadLatestUsers();
```

```tsx
<form className="flex flex-wrap items-end gap-3">
  <AdminSelect defaultValue={dynamicGroupId} name="dynamicGroupId">
    <option value="">Все пользователи</option>
    {dynamicGroupOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </AdminSelect>
  <AdminButton type="submit" variant="secondary">
    Применить
  </AdminButton>
</form>
```

- [ ] **Step 4: Add optional match badges on the user details page if layout stays readable**

```tsx
<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
  <h2 className="text-sm font-semibold text-white">Подходит под динамические группы</h2>
  <ul className="mt-3 space-y-2 text-sm text-[#dbe3ef]">
    {matchingDynamicGroups.map((group) => (
      <li key={group.id}>{group.name}</li>
    ))}
  </ul>
</div>
```

- [ ] **Step 5: Run the users-page test set**

Run: `npm test -- src/app/admin/users/page.test.tsx src/app/admin/users/[userId]/page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/users/page.tsx src/app/admin/users/page.test.tsx src/app/admin/users/[userId]/page.tsx src/app/admin/users/[userId]/page.test.tsx
git commit -m "feat: filter admin users by dynamic group"
```

### Task 5: Reuse Dynamic Groups in Trigger Rules

**Files:**
- Modify: `src/features/triggers/trigger-rule-types.ts`
- Modify: `src/features/triggers/trigger-condition.ts`
- Modify: `src/features/triggers/trigger-service.ts`
- Modify: `src/features/triggers/trigger-service.test.ts`
- Modify: `src/app/admin/triggers/actions.ts`
- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/trigger-form.tsx`
- Modify: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/app/admin/triggers/page.actions.test.ts`
- Modify: `src/app/admin/triggers/page.test.tsx`

**Interfaces:**
- Consumes: `matchesDynamicUserGroup`, `getDynamicUserGroupById`, trigger condition JSON
- Produces: `TriggerCondition | { field: "dynamicUserGroupId"; operator: "matches"; value: string }`

- [ ] **Step 1: Write failing trigger tests for dynamic groups**

```ts
import { describe, expect, it, vi } from "vitest";
import { evaluateConditions } from "./trigger-condition";

vi.mock("@/features/dynamic-user-groups/service", () => ({
  matchesSavedDynamicUserGroup: vi.fn().mockResolvedValue(true),
}));

describe("evaluateConditions", () => {
  it("supports dynamic group conditions", async () => {
    await expect(
      evaluateConditions(
        [{ field: "dynamicUserGroupId", operator: "matches", value: "group_new" }],
        {
          plan: "FREE",
          promoClaimed: false,
          hasActiveTariff: false,
          generationCount: 0,
          groupIds: [],
          remainingTokens: 0,
          tariffExpired: true,
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          lastActivityAt: null,
        },
      ),
    ).resolves.toBe(true);
  });
});
```

```tsx
expect(
  summarizeTriggerConditions(
    [{ field: "dynamicUserGroupId", operator: "matches", value: "group_new" }],
    [],
    [{ value: "group_new", label: "Без активного тарифа" }],
  ),
).toContain("Пользователь входит в динамическую группу «Без активного тарифа»");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx`
Expected: FAIL because trigger rules do not understand `dynamicUserGroupId` yet.

- [ ] **Step 3: Extend trigger typing, parsing, evaluation, and form drafts**

```ts
export type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "userGroupId"; operator: "isMember"; value: string }
  | { field: "dynamicUserGroupId"; operator: "matches"; value: string };
```

```ts
case "dynamicUserGroupId":
  return typeof value === "string" && value.trim().length > 0
    ? { field: "dynamicUserGroupId", operator: "matches", value: value.trim() }
    : null;
```

```ts
if (condition.field === "dynamicUserGroupId") {
  return matchesSavedDynamicUserGroup(condition.value, state);
}
```

```tsx
{
  label: "Динамическая группа",
  operators: [{ label: "Входит в группу", value: "matches" }],
  type: "string",
  valueLabel: "Группа",
  valueOptions: dynamicUserGroupOptions,
  valueType: "select",
  valueName: "dynamicUserGroupId",
}
```

- [ ] **Step 4: Show dynamic-group labels in trigger summaries and edit screens**

```tsx
case "dynamicUserGroupId":
  return `Пользователь входит в динамическую группу «${getDynamicUserGroupLabel(condition.value, dynamicUserGroupOptions)}»`;
```

- [ ] **Step 5: Run the trigger regression suite and typecheck**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/triggers src/app/admin/triggers
git commit -m "feat: support dynamic groups in triggers"
```

### Task 6: Final Verification and Cleanup

**Files:**
- Modify: any touched files from Tasks 1-5 if verification exposes issues

**Interfaces:**
- Consumes: completed implementation from earlier tasks
- Produces: verified feature set ready for review

- [ ] **Step 1: Run the targeted feature suite**

Run: `npm test -- src/features/dynamic-user-groups/rule-validator.test.ts src/features/dynamic-user-groups/evaluator.test.ts src/features/dynamic-user-groups/service.test.ts src/app/admin/dynamic-user-groups/page.test.tsx src/app/admin/dynamic-user-groups/[groupId]/page.test.tsx src/app/admin/dynamic-user-groups/dynamic-group-form.test.tsx src/app/admin/users/page.test.tsx src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx src/features/triggers/trigger-service.test.ts`
Expected: PASS

- [ ] **Step 2: Run the broad safety checks**

Run: `npm run typecheck`
Expected: PASS

Run: `npm test -- src/app/admin/admin-pages.test.ts src/app/admin/sidebar.test.ts src/app/admin/users/[userId]/page.test.tsx src/features/triggers/trigger-user-state.test.ts`
Expected: PASS

- [ ] **Step 3: Smoke-check key pages manually**

Run: open `/admin/dynamic-user-groups`, `/admin/dynamic-user-groups/<groupId>`, `/admin/users?dynamicGroupId=<groupId>`, and `/admin/triggers`
Expected: pages render without white screens, builder state persists, preview counts load, and trigger conditions save with dynamic-group labels.

- [ ] **Step 4: Commit any verification-driven fixes**

```bash
git add prisma/schema.prisma src/features/dynamic-user-groups src/app/admin/dynamic-user-groups src/app/admin/users src/app/admin/triggers src/features/triggers
git commit -m "test: verify dynamic user groups flow"
```

## Self-Review

### Spec Coverage

- Dedicated `/admin/dynamic-user-groups` section: covered in Task 3
- Flat builder with `AND` / `OR`: covered in Task 3
- Positive and negative conditions: covered in Tasks 1-2
- Live preview count and sample users: covered in Tasks 2-3
- Trigger reuse: covered in Task 5
- `/admin/users` filtering: covered in Task 4
- Virtual-only live evaluation: enforced in Tasks 1-2 and Global Constraints
- No manual-group references inside dynamic rules: enforced in Task 1 tests and validator

### Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task names exact files and concrete commands.
- Every code-writing step includes representative code to anchor implementation.

### Type Consistency

- `DynamicUserGroupDefinition` is introduced in Task 1 and reused unchanged in Tasks 2-5.
- `dynamicUserGroupId` is the only trigger-field name added for trigger integration.
- Boolean negation is normalized as `isNot` for dynamic groups and `matches` for trigger membership checks.

