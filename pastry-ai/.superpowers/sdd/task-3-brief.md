# Task 3: Trigger Service + Unit Tests

**Files:**
- Create: `src/features/triggers/trigger-service.ts`
- Create: `src/features/triggers/trigger-service.test.ts`

## Requirements

Create a trigger service with two functions: `scheduleTrigger` and `processPendingTriggers`.

### Step 1: Create test file

`src/features/triggers/trigger-service.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { createTriggerService } from "./trigger-service";

describe("createTriggerService", () => {
  const mockTriggerMessage = {
    id: "1",
    slug: "after-start",
    title: "test",
    text: "Hello!",
    delayMinutes: 15,
    targetPlans: ["FREE"],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const findActiveBySlugMock = vi.fn();
  const createScheduledMock = vi.fn();
  const findPendingScheduledMock = vi.fn();
  const markSentMock = vi.fn();
  const findExistingScheduledMock = vi.fn();

  const service = createTriggerService({
    findActiveBySlug: findActiveBySlugMock,
    createScheduled: createScheduledMock,
    findPendingScheduled: findPendingScheduledMock,
    markSent: markSentMock,
    findExistingScheduled: findExistingScheduledMock,
  });

  it("schedules a trigger when plan matches targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "FREE");

    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerSlug: "after-start",
        chatId: "12345",
        text: "Hello!",
      }),
    );
  });

  it("skips scheduling when plan does not match targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);

    await service.scheduleTrigger("after-start", "12345", "PRO");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("skips scheduling when trigger is not found", async () => {
    findActiveBySlugMock.mockResolvedValue(null);

    await service.scheduleTrigger("nonexistent", "12345", "FREE");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("does not create duplicate pending scheduled message", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);
    findExistingScheduledMock.mockResolvedValue({ id: "existing" });

    await service.scheduleTrigger("after-start", "12345", "FREE");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });
});
```

### Step 2: Create implementation

`src/features/triggers/trigger-service.ts`:

```typescript
export type TriggerMessageRecord = {
  id: string;
  slug: string;
  title: string;
  text: string;
  delayMinutes: number;
  targetPlans: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledMessageRecord = {
  id: string;
  triggerSlug: string;
  chatId: string;
  text: string;
  sendAt: Date;
  sentAt: Date | null;
  createdAt: Date;
};

type Dependencies = {
  findActiveBySlug(slug: string): Promise<TriggerMessageRecord | null>;
  createScheduled(data: {
    triggerSlug: string;
    chatId: string;
    text: string;
    sendAt: Date;
  }): Promise<ScheduledMessageRecord>;
  findExistingScheduled(
    triggerSlug: string,
    chatId: string,
  ): Promise<{ id: string } | null>;
  findPendingScheduled(
    limit: number,
  ): Promise<ScheduledMessageRecord[]>;
  markSent(id: string): Promise<void>;
};

export function createTriggerService(deps: Dependencies) {
  return {
    async scheduleTrigger(
      slug: string,
      chatId: string,
      plan: string,
    ): Promise<void> {
      const trigger = await deps.findActiveBySlug(slug);

      if (!trigger) {
        return;
      }

      const plans = trigger.targetPlans as string[];

      if (!plans.includes(plan)) {
        return;
      }

      const existing = await deps.findExistingScheduled(slug, chatId);

      if (existing) {
        return;
      }

      const sendAt = new Date(Date.now() + trigger.delayMinutes * 60 * 1000);

      await deps.createScheduled({
        chatId,
        sendAt,
        text: trigger.text,
        triggerSlug: slug,
      });
    },

    async processPendingTriggers(
      sendMessage: (chatId: string, text: string) => Promise<void>,
    ): Promise<number> {
      const pending = await deps.findPendingScheduled(50);
      let sentCount = 0;

      for (const message of pending) {
        try {
          await sendMessage(message.chatId, message.text);
          await deps.markSent(message.id);
          sentCount++;
        } catch (error) {
          console.error("Failed to send trigger message", {
            chatId: message.chatId,
            error,
          });
          await deps.markSent(message.id);
        }
      }

      return sentCount;
    },
  };
}
```

### Verification

- `npx vitest run src/features/triggers/trigger-service.test.ts` — all 4 tests pass
- `npm run typecheck` passes
- `npm run lint` passes