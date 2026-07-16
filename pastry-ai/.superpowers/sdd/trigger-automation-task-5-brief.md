### Task 5: Add create/edit trigger pages and server actions

**Files:**
- Create: `src/app/admin/triggers/actions.ts`
- Create: `src/app/admin/triggers/new/page.tsx`
- Create: `src/app/admin/triggers/[triggerId]/page.tsx`
- Create: `src/app/admin/triggers/trigger-form.tsx`
- Create: `src/app/admin/triggers/trigger-form.test.tsx`
- Modify: `src/app/admin/triggers/page.actions.test.ts`

**Interfaces:**
- Consumes:
  - `getTriggerTemplates()`
  - Prisma `triggerRule` CRUD
  - existing admin form and image components
- Produces:
  - `createTriggerRule(formData: FormData): Promise<void>`
  - `updateTriggerRule(formData: FormData): Promise<void>`
  - `deleteTriggerRule(formData: FormData): Promise<void>`

- [ ] **Step 1: Write the failing action test for structured trigger-rule persistence**

```ts
it("creates a trigger rule with event, conditions, and delay unit", async () => {
  const formData = new FormData();
  formData.set("name", "After Start: no promo");
  formData.set("eventKey", "user.started");
  formData.set("delayValue", "15");
  formData.set("delayUnit", "minutes");
  formData.set("messageText", "Hello!");
  formData.set("conditions", JSON.stringify([
    { field: "promoClaimed", operator: "is", value: false },
    { field: "hasActiveTariff", operator: "is", value: false },
  ]));

  await createTriggerRule(formData);

  expect(createMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        eventKey: "user.started",
        delayUnit: "minutes",
      }),
    }),
  );
});
```

- [ ] **Step 2: Run the action test to verify the old `createTriggerMessage` API fails**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts`
Expected: FAIL because actions still expect `slug`, `delayMinutes`, and `targetPlans`

- [ ] **Step 3: Implement reusable form parsing for conditions and delay**

```ts
function parseConditions(formData: FormData): TriggerCondition[] {
  const raw = String(formData.get("conditions") ?? "[]");
  const parsed = JSON.parse(raw) as TriggerCondition[];
  return Array.isArray(parsed) ? parsed : [];
}

function parseDelay(formData: FormData) {
  return {
    delayValue: Number(formData.get("delayValue") ?? 0),
    delayUnit: String(formData.get("delayUnit") ?? "now") as "now" | "minutes" | "hours" | "days",
  };
}
```

- [ ] **Step 4: Add trigger create and update actions**

```ts
export async function createTriggerRule(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const eventKey = String(formData.get("eventKey") ?? "").trim();
  const { delayValue, delayUnit } = parseDelay(formData);
  const messageText = String(formData.get("messageText") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const conditions = parseConditions(formData);

  if (!name || !eventKey || !messageText) return;

  await prisma.triggerRule.create({
    data: {
      name,
      eventKey,
      status: "draft",
      delayValue,
      delayUnit,
      messageText,
      imageUrl,
      buttons: [],
      conditions,
    },
  });

  revalidatePath("/admin/triggers");
  redirect("/admin/triggers");
}
```

- [ ] **Step 5: Build the two-column trigger form and preview layout**

```tsx
<div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
  <form action={action} className="space-y-5">
    <AdminField label="Trigger name">
      <AdminInput name="name" defaultValue={initial.name} />
    </AdminField>
    <AdminField label="Event">
      <select name="eventKey" defaultValue={initial.eventKey}>...</select>
    </AdminField>
    <ConditionsBuilder initialConditions={initial.conditions} />
    <DelayPicker initialValue={initial.delayValue} initialUnit={initial.delayUnit} />
    <AdminTextarea name="messageText" defaultValue={initial.messageText} />
    <AdminImageField textName="imageUrl" fileName="imageFile" />
  </form>
  <TelegramPreviewCard text={initial.messageText} imageUrl={initial.imageUrl} buttons={initial.buttons} />
</div>
```

- [ ] **Step 6: Run create/edit tests**

Run: `npm test -- src/app/admin/triggers/page.actions.test.ts src/app/admin/triggers/trigger-form.test.tsx`
Expected: PASS with create, update, delete, and template-prefill coverage

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/triggers/actions.ts src/app/admin/triggers/new/page.tsx src/app/admin/triggers/[triggerId]/page.tsx src/app/admin/triggers/trigger-form.tsx src/app/admin/triggers/trigger-form.test.tsx src/app/admin/triggers/page.actions.test.ts
git commit -m "feat: add trigger create and edit flows"
```

