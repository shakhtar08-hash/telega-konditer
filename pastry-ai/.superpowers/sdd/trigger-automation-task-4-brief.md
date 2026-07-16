### Task 4: Rebuild the trigger list screen around templates and event filters

**Files:**
- Create: `src/features/triggers/trigger-template.ts`
- Modify: `src/app/admin/triggers/page.tsx`
- Modify: `src/app/admin/triggers/page.test.tsx`
- Reuse: `src/components/admin/form.tsx`

**Interfaces:**
- Consumes:
  - `TriggerRule` Prisma reads
  - template metadata from `getTriggerTemplates()`
- Produces:
  - list screen with left support panel and right trigger table
  - query params `event`, `status`, `search`, `sort`

- [ ] **Step 1: Write the failing page test for templates and trigger rows**

```ts
it("renders the templates panel and trigger table", async () => {
  prismaMock.triggerRule.findMany.mockResolvedValue([
    {
      id: "rule_1",
      name: "After Start: no promo",
      eventKey: "user.started",
      status: "active",
      delayValue: 15,
      delayUnit: "minutes",
      messageText: "Hello!",
      imageUrl: null,
      buttons: null,
      conditions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const html = renderToStaticMarkup(await AdminTriggersPage({}));

  expect(html).toContain("Ready templates");
  expect(html).toContain("After Start: no promo");
  expect(html).toContain("Create trigger");
});
```

- [ ] **Step 2: Run the page test to verify the current grouped slug UI fails**

Run: `npm test -- src/app/admin/triggers/page.test.tsx`
Expected: FAIL because the page still renders grouped slug cards and no templates panel

- [ ] **Step 3: Add template definitions for left-panel quick starts**

```ts
export function getTriggerTemplates() {
  return [
    {
      key: "after-start-no-promo",
      name: "After Start: no promo",
      eventKey: "user.started",
      delayValue: 15,
      delayUnit: "minutes",
      conditions: [
        { field: "promoClaimed", operator: "is", value: false },
        { field: "hasActiveTariff", operator: "is", value: false },
      ],
    },
    // remaining templates...
  ] as const;
}
```

- [ ] **Step 4: Replace the current left-side slug list with templates and system events**

```tsx
<div className="space-y-4">
  <AdminPanel className="space-y-4">
    <div>
      <h3 className="font-semibold text-[#f4f7fb]">Ready templates</h3>
      <p className="mt-1 text-sm text-[#97a4b8]">
        Start from a prepared scenario and edit it before saving.
      </p>
    </div>
    <div className="space-y-2">
      {templates.map((template) => (
        <Link
          key={template.key}
          href={`/admin/triggers/new?template=${template.key}`}
          className="block rounded-lg border border-[#223047] bg-[#0d1522] p-3 text-sm text-[#f4f7fb]"
        >
          {template.name}
        </Link>
      ))}
    </div>
  </AdminPanel>
</div>
```

- [ ] **Step 5: Replace the right-side grouped forms with a searchable trigger table**

```tsx
<AdminPanel className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap gap-3">
      <AdminInput defaultValue={search} name="search" placeholder="Search triggers..." />
      <select name="event" defaultValue={eventFilter}>...</select>
      <select name="status" defaultValue={statusFilter}>...</select>
    </div>
    <Link href="/admin/triggers/new" className="inline-flex rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white">
      Create trigger
    </Link>
  </div>
</AdminPanel>
```

- [ ] **Step 6: Run page tests and verify the new composition**

Run: `npm test -- src/app/admin/triggers/page.test.tsx`
Expected: PASS with template panel, filters, and trigger rows

- [ ] **Step 7: Commit**

```bash
git add src/features/triggers/trigger-template.ts src/app/admin/triggers/page.tsx src/app/admin/triggers/page.test.tsx
git commit -m "feat: redesign trigger list screen"
```

