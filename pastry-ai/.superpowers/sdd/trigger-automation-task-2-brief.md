### Task 2: Build the trigger rule domain and condition evaluation service

**Files:**
- Create: `src/features/triggers/trigger-rule-types.ts`
- Create: `src/features/triggers/trigger-condition.ts`
- Modify: `src/features/triggers/trigger-service.ts`
- Test: `src/features/triggers/trigger-service.test.ts`

**Interfaces:**
- Consumes:
  - `TriggerRuleRecord`
  - scheduled-message persistence callbacks
  - user state snapshot with `plan`, `promoClaimed`, `hasActiveTariff`, `generationCount`, `groupIds`
- Produces:
  - `evaluateConditions(conditions: TriggerCondition[], state: TriggerUserState): boolean`
  - `scheduleTrigger(eventKey: string, chatId: string, state: TriggerUserState, eventOccurredAt?: Date): Promise<void>`

- [ ] **Step 1: Write the failing tests for multi-condition `AND` evaluation**

```ts
it("schedules a rule only when all conditions pass", async () => {
  findActiveRulesByEventMock.mockResolvedValue([
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
      conditions: [
        { field: "promoClaimed", operator: "is", value: false },
        { field: "hasActiveTariff", operator: "is", value: false },
      ],
    },
  ]);

  await service.scheduleTrigger("user.started", "12345", {
    plan: "FREE",
    promoClaimed: false,
    hasActiveTariff: false,
    generationCount: 0,
    groupIds: [],
  });

  expect(createScheduledMock).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify the old slug-based service fails**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL because `findActiveBySlug` and `targetPlans` logic do not satisfy event-plus-conditions behavior

- [ ] **Step 3: Define trigger rule and user-state types**

```ts
export type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "groupId"; operator: "contains"; value: string };

export type TriggerUserState = {
  plan: string;
  promoClaimed: boolean;
  hasActiveTariff: boolean;
  generationCount: number;
  groupIds: string[];
};

export type TriggerRuleRecord = {
  id: string;
  name: string;
  eventKey: string;
  status: "draft" | "active" | "disabled";
  delayValue: number;
  delayUnit: "now" | "minutes" | "hours" | "days";
  messageText: string;
  imageUrl: string | null;
  buttons: unknown;
  conditions: TriggerCondition[];
};
```

- [ ] **Step 4: Implement condition evaluation and delay calculation**

```ts
export function evaluateConditions(
  conditions: TriggerCondition[],
  state: TriggerUserState,
): boolean {
  return conditions.every((condition) => {
    switch (condition.field) {
      case "promoClaimed":
        return state.promoClaimed === condition.value;
      case "hasActiveTariff":
        return state.hasActiveTariff === condition.value;
      case "generationCount":
        return condition.operator === "gte"
          ? state.generationCount >= condition.value
          : state.generationCount === condition.value;
      case "groupId":
        return state.groupIds.includes(condition.value);
    }
  });
}

export function computeSendAt(triggeredAt: Date, delayValue: number, delayUnit: TriggerRuleRecord["delayUnit"]): Date {
  const unitToMs = {
    now: 0,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  } as const;

  return new Date(triggeredAt.getTime() + delayValue * unitToMs[delayUnit]);
}
```

- [ ] **Step 5: Refactor the service to load active rules by event and enqueue by condition match**

```ts
async scheduleTrigger(
  eventKey: string,
  chatId: string,
  state: TriggerUserState,
  eventOccurredAt = new Date(),
): Promise<void> {
  const rules = await deps.findActiveRulesByEvent(eventKey);

  for (const rule of rules) {
    if (!evaluateConditions(rule.conditions, state)) {
      continue;
    }

    const existing = await deps.findExistingScheduled(rule.id, chatId, eventOccurredAt);
    if (existing) {
      continue;
    }

    await deps.createScheduled({
      triggerRuleId: rule.id,
      triggerEventKey: eventKey,
      chatId,
      text: rule.messageText,
      imageUrl: rule.imageUrl,
      buttons: rule.buttons,
      triggeredAt: eventOccurredAt,
      sendAt: computeSendAt(eventOccurredAt, rule.delayValue, rule.delayUnit),
    });
  }
}
```

- [ ] **Step 6: Run focused tests and verify service behavior**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: PASS with coverage for `AND` evaluation, deduplication, and delay calculation

- [ ] **Step 7: Commit**

```bash
git add src/features/triggers/trigger-rule-types.ts src/features/triggers/trigger-condition.ts src/features/triggers/trigger-service.ts src/features/triggers/trigger-service.test.ts
git commit -m "feat: add trigger rule evaluation service"
```

