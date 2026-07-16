### Task 6: Finish queue processing, regression coverage, and end-to-end verification

**Files:**
- Modify: `src/app/api/cron/process-triggers/route.ts`
- Modify: `src/features/triggers/trigger-service.ts`
- Modify: `src/features/triggers/trigger-service.test.ts`
- Modify: `src/app/admin/triggers/page.test.tsx`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes:
  - `TriggerRule` records
  - `ScheduledMessage` queue rows
  - new admin routes
- Produces:
  - queue sender aware of `triggerRuleId`, `triggerEventKey`, `buttons`
  - updated product docs references

- [ ] **Step 1: Write the failing regression test for queued message snapshots**

```ts
it("sends queued trigger payloads using the stored snapshot", async () => {
  findPendingScheduledMock.mockResolvedValue([
    {
      id: "pending_1",
      triggerRuleId: "rule_1",
      triggerEventKey: "user.started",
      chatId: "12345",
      text: "Snapshot text",
      imageUrl: "/uploads/admin/triggers/hero.webp",
      buttons: [{ text: "Try free", type: "url", value: "https://example.com" }],
      triggeredAt: new Date(),
      sendAt: new Date(),
      sentAt: null,
      createdAt: new Date(),
    },
  ]);

  await service.processPendingTriggers(sendMessageMock);

  expect(sendMessageMock).toHaveBeenCalledWith("12345", "Snapshot text", {
    imageUrl: "/uploads/admin/triggers/hero.webp",
    buttons: [{ text: "Try free", type: "url", value: "https://example.com" }],
  });
});
```

- [ ] **Step 2: Run the queue test to verify the sender still only handles plain text**

Run: `npm test -- src/features/triggers/trigger-service.test.ts`
Expected: FAIL because `processPendingTriggers` currently only calls `sendMessage(chatId, text)`

- [ ] **Step 3: Expand queue processing to pass message snapshots through the sender callback**

```ts
async processPendingTriggers(
  sendMessage: (
    chatId: string,
    text: string,
    payload: { imageUrl: string | null; buttons: unknown },
  ) => Promise<void>,
): Promise<number> {
  const pending = await deps.findPendingScheduled(50);

  for (const message of pending) {
    await sendMessage(message.chatId, message.text, {
      imageUrl: message.imageUrl ?? null,
      buttons: message.buttons ?? null,
    });
    await deps.markSent(message.id);
  }

  return pending.length;
}
```

- [ ] **Step 4: Update the cron route to send image-first or text-only Telegram messages**

```ts
const sent = await triggerService.processPendingTriggers(
  async (chatId, text, payload) => {
    if (payload.imageUrl) {
      await bot.api.sendPhoto(chatId, payload.imageUrl, { caption: text });
      return;
    }

    await bot.api.sendMessage(chatId, text);
  },
);
```

- [ ] **Step 5: Run the verification set**

Run: `npm test -- src/features/triggers/trigger-service.test.ts src/app/api/cron/process-triggers/route.test.ts src/app/admin/triggers/page.test.tsx src/app/admin/triggers/page.actions.test.ts`
Expected: PASS across service, queue, page, and action tests

Run: `npm test -- src/components/admin/chat-bot-subnav.test.ts`
Expected: PASS to confirm adjacent chatbot navigation remains stable

- [ ] **Step 6: Update roadmap/docs references**

```md
- `Triggers` redesigned into event-based automation rules with templates and condition builder.
- `Onboarding` remains a separate chatbot flow.
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cron/process-triggers/route.ts src/features/triggers/trigger-service.ts src/features/triggers/trigger-service.test.ts src/app/admin/triggers/page.test.tsx docs/roadmap.md
git commit -m "feat: finish trigger automation rollout"
```

## Self-Review

### Spec Coverage

- Event-based trigger rules: covered by Tasks 1, 2, and 3.
- Multiple `AND` conditions: covered by Tasks 2 and 5.
- Reference-aligned list and create/edit UI: covered by Tasks 4 and 5.
- Templates in interface: covered by Tasks 4 and 5.
- Snapshot-based scheduled sends: covered by Tasks 1, 2, and 6.
- Onboarding stays separate: preserved by Tasks 4 and 6, with no onboarding file changes required.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred “implement later” language remains in task steps.
- Every task names concrete files and commands.
- Every code-changing step includes representative target code rather than generic prose.

### Type Consistency

- `TriggerRuleRecord`, `TriggerCondition`, and `TriggerUserState` are defined in Task 2 and reused consistently in Tasks 3, 5, and 6.
- Scheduled queue references use `triggerRuleId` and `triggerEventKey` consistently after Task 1.
- Delay handling uses `delayValue` plus `delayUnit` consistently in schema, service, and form tasks.
