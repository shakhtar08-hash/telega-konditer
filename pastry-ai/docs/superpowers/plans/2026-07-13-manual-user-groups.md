# Manual User Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual user groups as a first-class admin feature, expose them in trigger conditions as a structured audience rule, translate the touched trigger screens to Russian, and support deleting existing triggers explicitly.

**Architecture:** Introduce explicit `UserGroup` and `UserGroupMember` persistence, add dedicated admin routes for group management and user detail editing, then connect trigger conditions and runtime evaluation to real membership data. Keep the existing hybrid trigger model intact by treating manual groups as one additional condition type while system-derived segments remain separate.

**Tech Stack:** Next.js App Router, React Server Components, server actions, Prisma/PostgreSQL, Vitest, existing admin form and table components

## Global Constraints

- manual user groups are managed explicitly by admins
- system segments such as active tariff, promo received, and generation count remain separate trigger conditions
- keep the `admin/triggers` interface fully in Russian
- make deleting existing triggers an explicit supported admin action
- no dynamic or rule-based groups in the first version
- no auto-sync from system segments into manual groups
- no bulk assignment in the first version
- no negative group condition such as `User is not in group`
- no multi-group operators such as any-of, all-of, or none-of
- no redesign of onboarding around groups

---

### Task 1: Add manual user-group persistence and runtime loading

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_manual_user_groups/migration.sql`
- Modify: `src/features/triggers/trigger-rule-types.ts`
- Modify: `src/features/triggers/trigger-user-state.ts`
- Create: `src/features/triggers/trigger-user-state.test.ts`

**Interfaces:**
- Consumes:
  - existing `User` Prisma model
  - existing `TriggerUserState` shape from `src/features/triggers/trigger-rule-types.ts`
- Produces:
  - Prisma models `UserGroup` and `UserGroupMember`
  - `TriggerUserState["groupIds"]` loaded from persisted memberships
  - `createTriggerUserStateLoader(deps)` returning `Promise<TriggerUserState>`

- [ ] **Step 1: Write the failing loader test for manual group ids**

```ts
it("loads persisted user group memberships into trigger state", async () => {
  const loadTriggerUserState = createTriggerUserStateLoader({
    countGeneratedRecipes: vi.fn().mockResolvedValue(2),
    findUser: vi.fn().mockResolvedValue({
      plan: "FREE",
      promoClaimed: false,
    }),
    findUserGroups: vi.fn().mockResolvedValue([
      { userGroupId: "vip" },
      { userGroupId: "promo-testers" },
    ]),
    findUserTariff: vi.fn().mockResolvedValue(null),
  });

  await expect(loadTriggerUserState("user_1")).resolves.toEqual({
    plan: "FREE",
    promoClaimed: false,
    hasActiveTariff: false,
    generationCount: 2,
    groupIds: ["vip", "promo-testers"],
  });
});
```

- [ ] **Step 2: Run the focused loader test to verify `findUserGroups` does not exist yet**

Run: `npm test -- src/features/triggers/trigger-user-state.test.ts`
Expected: FAIL with missing dependency or `groupIds: []`

- [ ] **Step 3: Extend the Prisma schema with explicit group tables**

```prisma
model UserGroup {
  id          String            @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  memberships UserGroupMember[]

  @@unique([name])
}

model UserGroupMember {
  userId      String
  userGroupId String
  createdAt   DateTime @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userGroup   UserGroup @relation(fields: [userGroupId], references: [id], onDelete: Cascade)

  @@id([userId, userGroupId])
  @@index([userGroupId])
}
```

Also add to `User`:

```prisma
groupMemberships UserGroupMember[]
```

- [ ] **Step 4: Write a safe migration with cascading membership cleanup**

```sql
CREATE TABLE "UserGroup" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UserGroup_name_key" ON "UserGroup"("name");

CREATE TABLE "UserGroupMember" (
  "userId" TEXT NOT NULL,
  "userGroupId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserGroupMember_pkey" PRIMARY KEY ("userId", "userGroupId"),
  CONSTRAINT "UserGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserGroupMember_userGroupId_fkey" FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserGroupMember_userGroupId_idx" ON "UserGroupMember"("userGroupId");
```

- [ ] **Step 5: Update trigger user-state loading to include membership ids**

```ts
type TriggerUserStateLoaderDeps = {
  countGeneratedRecipes(userId: string): Promise<number>;
  findUser(userId: string): Promise<{
    plan: TriggerUserState["plan"];
    promoClaimed: boolean;
  }>;
  findUserGroups(userId: string): Promise<Array<{ userGroupId: string }>>;
  findUserTariff(userId: string): Promise<{ expiresAt: Date } | null>;
};
```

And in the loader:

```ts
const [user, userTariff, generationCount, memberships] = await Promise.all([
  deps.findUser(userId),
  deps.findUserTariff(userId),
  deps.countGeneratedRecipes(userId),
  deps.findUserGroups(userId),
]);

return {
  plan: user.plan,
  promoClaimed: user.promoClaimed,
  hasActiveTariff: Boolean(userTariff && userTariff.expiresAt > new Date()),
  generationCount,
  groupIds: memberships.map((membership) => membership.userGroupId),
};
```

- [ ] **Step 6: Run schema and loader verification**

Run: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script`
Expected: SQL diff prints without schema parse errors

Run: `npm test -- src/features/triggers/trigger-user-state.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/<timestamp>_manual_user_groups/migration.sql src/features/triggers/trigger-rule-types.ts src/features/triggers/trigger-user-state.ts src/features/triggers/trigger-user-state.test.ts
git commit -m "feat: add manual user group persistence"
```

### Task 2: Add user-group admin routes and server actions

**Files:**
- Create: `src/app/admin/user-groups/actions.ts`
- Create: `src/app/admin/user-groups/page.tsx`
- Create: `src/app/admin/user-groups/page.test.tsx`
- Create: `src/app/admin/user-groups/[groupId]/page.tsx`
- Create: `src/app/admin/user-groups/[groupId]/page.test.tsx`
- Create: `src/app/admin/user-groups/group-membership-actions.test.ts`
- Modify: `src/app/admin/layout.tsx` or the sidebar source used for admin navigation

**Interfaces:**
- Consumes:
  - `prisma.userGroup`
  - `prisma.userGroupMember`
  - `prisma.user`
- Produces:
  - `createUserGroup(formData: FormData): Promise<void>`
  - `updateUserGroup(formData: FormData): Promise<void>`
  - `deleteUserGroup(formData: FormData): Promise<void>`
  - `addUserToGroup(formData: FormData): Promise<void>`
  - `removeUserFromGroup(formData: FormData): Promise<void>`

- [ ] **Step 1: Write the failing action test for duplicate-safe membership creation**

```ts
it("adds a user to a group without creating duplicates", async () => {
  const formData = new FormData();
  formData.set("userId", "user_1");
  formData.set("userGroupId", "group_1");

  await addUserToGroup(formData);

  expect(upsertMembershipMock).toHaveBeenCalledWith({
    create: { userId: "user_1", userGroupId: "group_1" },
    update: {},
    where: {
      userId_userGroupId: {
        userId: "user_1",
        userGroupId: "group_1",
      },
    },
  });
});
```

- [ ] **Step 2: Run the user-group action tests to verify the routes do not exist yet**

Run: `npm test -- src/app/admin/user-groups/group-membership-actions.test.ts`
Expected: FAIL with missing module or action exports

- [ ] **Step 3: Implement user-group actions around Prisma**

```ts
export async function addUserToGroup(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "").trim();
  const userGroupId = String(formData.get("userGroupId") ?? "").trim();

  if (!userId || !userGroupId) return;

  await prisma.userGroupMember.upsert({
    where: {
      userId_userGroupId: { userId, userGroupId },
    },
    update: {},
    create: { userId, userGroupId },
  });

  revalidatePath("/admin/user-groups");
  revalidatePath(`/admin/user-groups/${userGroupId}`);
  revalidatePath(`/admin/users/${userId}`);
}
```

- [ ] **Step 4: Build the group list page with creation and delete affordances**

```tsx
const groups = await prisma.userGroup.findMany({
  orderBy: { updatedAt: "desc" },
  select: {
    id: true,
    name: true,
    description: true,
    updatedAt: true,
    _count: { select: { memberships: true } },
  },
});
```

Render:

```tsx
<AdminPageHeader
  title="Группы пользователей"
  description="Ручные группы для сегментации и триггеров."
/>
```

- [ ] **Step 5: Build the group detail page with user search and membership list**

```tsx
const [group, members, candidateUsers] = await Promise.all([
  prisma.userGroup.findUniqueOrThrow({ where: { id: groupId } }),
  prisma.userGroupMember.findMany({
    where: { userGroupId: groupId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  }),
  prisma.user.findMany({
    where: search
      ? {
          OR: [
            { telegramId: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    take: 20,
  }),
]);
```

- [ ] **Step 6: Add a sidebar entry under admin navigation**

Add a new item similar to existing admin links:

```ts
{ href: "/admin/user-groups", label: "Группы пользователей" }
```

- [ ] **Step 7: Run focused page and action tests**

Run: `npm test -- src/app/admin/user-groups/page.test.tsx src/app/admin/user-groups/[groupId]/page.test.tsx src/app/admin/user-groups/group-membership-actions.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/user-groups/actions.ts src/app/admin/user-groups/page.tsx src/app/admin/user-groups/page.test.tsx src/app/admin/user-groups/[groupId]/page.tsx src/app/admin/user-groups/[groupId]/page.test.tsx src/app/admin/user-groups/group-membership-actions.test.ts src/app/admin/layout.tsx
git commit -m "feat: add admin user group management"
```

### Task 3: Add dedicated user detail page with group membership editing

**Files:**
- Create: `src/app/admin/users/[userId]/page.tsx`
- Create: `src/app/admin/users/[userId]/page.test.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/users/actions.ts`
- Create: `src/app/admin/users/user-groups-actions.test.ts`

**Interfaces:**
- Consumes:
  - `addUserToGroup`, `removeUserFromGroup` from `src/app/admin/user-groups/actions.ts`
  - existing tariff editing flow in `src/app/admin/users/page.tsx`
- Produces:
  - user detail route `/admin/users/[userId]`
  - list-page navigation into the detail route

- [ ] **Step 1: Write the failing page test for the user detail group block**

```ts
it("renders user groups and membership actions on the user detail page", async () => {
  prismaMock.user.findUniqueOrThrow.mockResolvedValue({
    id: "user_1",
    telegramId: "12345",
    username: "cakeboss",
    name: "Cake Boss",
    promoClaimed: false,
    createdAt: new Date(),
    userTariff: null,
    groupMemberships: [
      {
        userGroupId: "group_1",
        userGroup: { id: "group_1", name: "VIP" },
      },
    ],
  });

  const html = renderToStaticMarkup(
    await AdminUserPage({ params: Promise.resolve({ userId: "user_1" }) }),
  );

  expect(html).toContain("Группы пользователя");
  expect(html).toContain("VIP");
});
```

- [ ] **Step 2: Run the page test to verify the route does not exist yet**

Run: `npm test -- src/app/admin/users/[userId]/page.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Build the user detail page around existing tariff data**

Load:

```ts
const [user, groups] = await Promise.all([
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      userTariff: {
        include: { tariffPlan: true },
      },
      groupMemberships: {
        include: { userGroup: true },
        orderBy: { createdAt: "desc" },
      },
    },
  }),
  prisma.userGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }),
]);
```

- [ ] **Step 4: Add a user-page membership editor with add/remove forms**

Render a group add form:

```tsx
<form action={addUserToGroup} className="flex gap-2">
  <input name="userId" type="hidden" value={user.id} />
  <AdminSelect name="userGroupId">
    {availableGroups.map((group) => (
      <option key={group.id} value={group.id}>
        {group.name}
      </option>
    ))}
  </AdminSelect>
  <AdminButton type="submit" variant="secondary">
    Добавить группу
  </AdminButton>
</form>
```

- [ ] **Step 5: Add an `Открыть` action from `/admin/users` into the detail route**

Add a list-table action cell like:

```tsx
{
  header: "",
  cell: (user) => (
    <Link
      href={`/admin/users/${user.id}`}
      className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
    >
      Открыть
    </Link>
  ),
}
```

- [ ] **Step 6: Run the focused user admin tests**

Run: `npm test -- src/app/admin/users/[userId]/page.test.tsx src/app/admin/users/user-groups-actions.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/users/[userId]/page.tsx src/app/admin/users/[userId]/page.test.tsx src/app/admin/users/page.tsx src/app/admin/users/actions.ts src/app/admin/users/user-groups-actions.test.ts
git commit -m "feat: add user detail group editor"
```

### Task 4: Replace raw trigger `groupId` input with structured user-group conditions

**Files:**
- Modify: `src/features/triggers/trigger-rule-types.ts`
- Modify: `src/features/triggers/trigger-condition.ts`
- Modify: `src/app/admin/triggers/actions.ts`
- Modify: `src/app/admin/triggers/trigger-form.tsx`
- Modify: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/app/admin/triggers/page.actions.test.ts`
- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/page.test.tsx`

**Interfaces:**
- Consumes:
  - `UserGroup` records from Prisma
  - existing trigger form condition builder
- Produces:
  - `TriggerCondition` variant `{ field: "userGroupId"; operator: "isMember"; value: string }`
  - trigger form support for a real group select

- [ ] **Step 1: Write the failing trigger-form test for the structured group condition**

```ts
it("creates a default draft for persisted user-group membership", () => {
  expect(createDefaultConditionDraft("userGroupId")).toEqual({
    field: "userGroupId",
    operator: "isMember",
    value: "",
  });
});
```

- [ ] **Step 2: Run the trigger form tests to confirm the old `groupId` condition is still wired in**

Run: `npm test -- src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts`
Expected: FAIL because `groupId`/`contains` is still the supported shape

- [ ] **Step 3: Replace the trigger condition type and evaluator**

Update the type:

```ts
export type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "userGroupId"; operator: "isMember"; value: string };
```

Update evaluation:

```ts
case "userGroupId":
  return state.groupIds.includes(condition.value);
```

- [ ] **Step 4: Update trigger action parsing and normalization**

Replace:

```ts
case "groupId":
  return candidate.operator === "contains"
```

With:

```ts
case "userGroupId":
  return candidate.operator === "isMember"
    ? {
        field: "userGroupId",
        operator: "isMember",
        value: String(candidate.value ?? "").trim(),
      }
    : null;
```

- [ ] **Step 5: Rebuild the condition-row UI to use real group options**

Add trigger-form prop:

```ts
type TriggerFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
  eventOptions: readonly TriggerEventOption[];
  initial: TriggerFormValues;
  submitLabel: string;
  title: string;
  userGroups: Array<{ id: string; name: string; memberCount: number }>;
};
```

Render the group condition as:

```tsx
<AdminSelect
  aria-label={`Условие ${index + 1}: группа`}
  value={draft.value}
  onChange={(event) => onChange(event.target.value)}
>
  <option value="">Выберите группу</option>
  {userGroups.map((group) => (
    <option key={group.id} value={group.id}>
      {group.name} ({group.memberCount})
    </option>
  ))}
</AdminSelect>
```

- [ ] **Step 6: Update trigger list summaries to resolve Russian labels**

Replace old English summaries like:

```ts
return `User group contains ${condition.value}`;
```

With Russian copy that resolves group names when available:

```ts
return `Состоит в группе: ${groupName ?? "Удалённая группа"}`;
```

- [ ] **Step 7: Run the focused trigger admin tests**

Run: `npm test -- src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/triggers/trigger-rule-types.ts src/features/triggers/trigger-condition.ts src/app/admin/triggers/actions.ts src/app/admin/triggers/trigger-form.tsx src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/page.tsx src/app/admin/triggers/page.test.tsx
git commit -m "feat: add structured user group trigger conditions"
```

### Task 5: Translate touched trigger screens to Russian and make delete flow explicit

**Files:**
- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/new/page.tsx`
- Modify: `src/app/admin/triggers/[triggerId]/page.tsx`
- Modify: `src/app/admin/triggers/trigger-form.tsx`
- Modify: `src/app/admin/triggers/page.test.tsx`
- Modify: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/components/admin/chat-bot-subnav.tsx`

**Interfaces:**
- Consumes:
  - existing trigger screens and delete server action
- Produces:
  - Russian-facing labels, helper text, empty states, filter labels, and delete language

- [ ] **Step 1: Write the failing page test for Russian trigger copy**

```ts
it("renders the triggers screen in Russian", async () => {
  prismaMock.triggerRule.findMany.mockResolvedValue([]);

  const html = renderToStaticMarkup(await AdminTriggersPage({}));

  expect(html).toContain("Триггеры");
  expect(html).toContain("Шаблоны");
  expect(html).toContain("Создать триггер");
  expect(html).toContain("Нет триггеров");
});
```

- [ ] **Step 2: Run the page test to verify English copy remains**

Run: `npm test -- src/app/admin/triggers/page.test.tsx`
Expected: FAIL because the page still contains English labels such as `Ready templates`

- [ ] **Step 3: Translate the trigger list page**

Examples of target copy:

```tsx
<AdminPageHeader
  title="Триггеры"
  description="Автоматические сообщения по событиям, реактивации и follow-up сценарии."
/>
```

Filters:

```ts
const statusOptions = [
  { value: "all", label: "Все статусы" },
  { value: "active", label: "Активные" },
  { value: "draft", label: "Черновики" },
  { value: "disabled", label: "Отключённые" },
] as const;
```

- [ ] **Step 4: Translate the create/edit trigger form and delete affordance**

Examples:

```tsx
<h3 className="font-semibold text-[#f4f7fb]">Условия</h3>
<AdminButton type="button" variant="secondary">
  Добавить условие
</AdminButton>
```

Delete copy:

```tsx
<button ...>
  Удалить триггер
</button>
```

And helper text:

```tsx
<p className="text-sm text-[#97a4b8]">
  Удаление уберёт правило из автоматизаций и остановит будущие срабатывания.
</p>
```

- [ ] **Step 5: Make delete an explicit supported flow on the edit page**

Ensure the edit page always includes:

```tsx
deleteAction={deleteTriggerRule}
```

And the form keeps the delete section visually distinct in Russian.

- [ ] **Step 6: Run the touched trigger UI tests**

Run: `npm test -- src/app/admin/triggers/page.test.tsx src/app/admin/triggers/trigger-form.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/triggers/page.tsx src/app/admin/triggers/new/page.tsx src/app/admin/triggers/[triggerId]/page.tsx src/app/admin/triggers/trigger-form.tsx src/app/admin/triggers/page.test.tsx src/app/admin/triggers/trigger-form.test.tsx src/components/admin/chat-bot-subnav.tsx
git commit -m "feat: localize trigger admin to Russian"
```

### Task 6: Final integration verification and docs refresh

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/specs/2026-07-13-manual-user-groups-design.md` (only if implementation realities require a clarified note)
- Modify: `src/app/admin/triggers/page.actions.test.ts`
- Modify: `src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes:
  - completed user-group admin routes
  - updated trigger conditions and runtime loading
- Produces:
  - documented feature rollout
  - final regression coverage across triggers and memberships

- [ ] **Step 1: Add a failing integration-level regression test for user-group trigger evaluation**

```ts
it("schedules a trigger when the user belongs to the selected manual group", async () => {
  findActiveRulesByEventMock.mockResolvedValue([
    {
      ...baseRule,
      conditions: [
        { field: "userGroupId", operator: "isMember", value: "vip" },
      ],
    },
  ]);
  findExistingScheduledMock.mockResolvedValue(null);

  await service.scheduleTrigger("user.started", "12345", {
    ...baseState,
    groupIds: ["vip"],
  });

  expect(createScheduledMock).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the focused integration tests**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/admin/triggers/page.actions.test.ts`
Expected: PASS after the final wiring is complete

- [ ] **Step 3: Update roadmap to mention manual user groups and Russian trigger admin**

Add bullets like:

```md
- Manual user groups added with `/admin/user-groups` and dedicated user detail editing.
- Trigger conditions now support structured group membership and the trigger admin UI is localized to Russian.
```

- [ ] **Step 4: Run the final verification set**

Run: `npm test -- src/features/triggers/trigger-user-state.test.ts src/app/admin/user-groups/page.test.tsx src/app/admin/user-groups/[groupId]/page.test.tsx src/app/admin/users/[userId]/page.test.tsx src/app/admin/triggers/page.test.tsx src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts src/features/triggers/trigger-service.test.ts`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md docs/superpowers/specs/2026-07-13-manual-user-groups-design.md src/app/admin/triggers/page.actions.test.ts src/features/triggers/trigger-service.test.ts
git commit -m "feat: finish manual user group rollout"
```

## Self-Review

### Spec Coverage

- `UserGroup` plus membership persistence: Task 1.
- `/admin/user-groups` list and group detail page: Task 2.
- `/admin/users/[userId]` detail page and membership editing: Task 3.
- structured trigger group condition and hybrid model: Task 4.
- Russian trigger admin and explicit trigger deletion support: Task 5.
- final regression coverage and docs: Task 6.

### Placeholder Scan

- No `TODO`, `TBD`, or generic “add tests” placeholders remain.
- Each task names concrete files, commands, and target interfaces.
- Code-changing steps include representative code blocks or exact query patterns.

### Type Consistency

- Manual group condition uses `field: "userGroupId"` and `operator: "isMember"` consistently across schema, parser, form, evaluator, and tests.
- User membership persistence consistently uses `UserGroup` and `UserGroupMember`.
- Runtime user state consistently exposes `groupIds: string[]` to trigger evaluation.
