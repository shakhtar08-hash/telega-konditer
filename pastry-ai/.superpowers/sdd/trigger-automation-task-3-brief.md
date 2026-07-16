### Task 3: Add event state loading and backend trigger entry points

**Files:**
- Create: `src/features/triggers/trigger-user-state.ts`
- Create: `src/features/triggers/trigger-event-service.ts`
- Modify: `src/app/api/cron/process-triggers/route.ts`
- Modify: `src/bot/commands/start.ts`
- Modify: `src/app/api/payments/cloudpayments/route.ts`
- Test: `src/features/triggers/trigger-event-service.test.ts`
- Test: `src/app/api/cron/process-triggers/route.test.ts`

**Interfaces:**
- Consumes:
  - `createTriggerService`
  - Prisma repositories for `User`, `UserTariff`, `TokenUsage`, and `ScheduledMessage`
- Produces:
  - `loadTriggerUserState(userId: string): Promise<TriggerUserState>`
  - `handleTriggerEvent(eventKey: string, payload: { userId: string; chatId: string; occurredAt?: Date }): Promise<void>`

- [ ] **Step 1: Write the failing test for event dispatch using loaded user state**

```ts
it("loads user state and dispatches the start event", async () => {
  loadTriggerUserStateMock.mockResolvedValue({
    plan: "FREE",
    promoClaimed: false,
    hasActiveTariff: false,
    generationCount: 0,
    groupIds: [],
  });

  await service.handleTriggerEvent("user.started", {
    userId: "user_1",
    chatId: "12345",
    occurredAt: new Date("2026-07-13T10:00:00.000Z"),
  });

  expect(scheduleTriggerMock).toHaveBeenCalledWith(
    "user.started",
    "12345",
    expect.objectContaining({ promoClaimed: false }),
    new Date("2026-07-13T10:00:00.000Z"),
  );
});
```

- [ ] **Step 2: Run test to verify the event service does not exist yet**

Run: `npm test -- src/features/triggers/trigger-event-service.test.ts`
Expected: FAIL with module not found or missing `handleTriggerEvent`

- [ ] **Step 3: Implement trigger user-state loading from Prisma**

```ts
export async function loadTriggerUserState(userId: string): Promise<TriggerUserState> {
  const [user, userTariff, generationCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.userTariff.findUnique({ where: { userId } }),
    prisma.generatedRecipeContext.count({ where: { userId } }),
  ]);

  return {
    plan: user.plan,
    promoClaimed: user.promoClaimed,
    hasActiveTariff: Boolean(userTariff && userTariff.expiresAt > new Date()),
    generationCount,
    groupIds: [],
  };
}
```

- [ ] **Step 4: Implement the event dispatch wrapper**

```ts
export function createTriggerEventService(deps: {
  loadTriggerUserState(userId: string): Promise<TriggerUserState>;
  scheduleTrigger(
    eventKey: string,
    chatId: string,
    state: TriggerUserState,
    occurredAt?: Date,
  ): Promise<void>;
}) {
  return {
    async handleTriggerEvent(
      eventKey: string,
      payload: { userId: string; chatId: string; occurredAt?: Date },
    ): Promise<void> {
      const state = await deps.loadTriggerUserState(payload.userId);
      await deps.scheduleTrigger(eventKey, payload.chatId, state, payload.occurredAt);
    },
  };
}
```

- [ ] **Step 5: Replace direct `scheduleTrigger("after-start", ...)` style calls at existing event hooks**

```ts
await triggerEventService.handleTriggerEvent("user.started", {
  userId: user.id,
  chatId: telegramId,
});

await triggerEventService.handleTriggerEvent("tariff.paid", {
  userId: user.id,
  chatId: telegramId,
});
```

- [ ] **Step 6: Run focused backend tests**

Run: `npm test -- src/features/triggers/trigger-event-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/bot/commands/start.test.ts`
Expected: PASS with event-key dispatch and queue processing still green

- [ ] **Step 7: Commit**

```bash
git add src/features/triggers/trigger-user-state.ts src/features/triggers/trigger-event-service.ts src/app/api/cron/process-triggers/route.ts src/bot/commands/start.ts src/app/api/payments/cloudpayments/route.ts src/features/triggers/trigger-event-service.test.ts src/app/api/cron/process-triggers/route.test.ts
git commit -m "feat: dispatch trigger events from product hooks"
```

