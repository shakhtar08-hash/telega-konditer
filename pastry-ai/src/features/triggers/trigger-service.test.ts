import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTriggerService } from "./trigger-service";

describe("createTriggerService", () => {
  const mockTriggerMessage = {
    id: "1",
    slug: "after-start",
    title: "test",
    text: "Hello!",
    delayMinutes: 15,
    targetPlans: ["promo"],
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules a trigger when plan matches targetPlans", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "promo");

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

    await service.scheduleTrigger("after-start", "12345", "pastry-chef");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("skips scheduling when trigger is not found", async () => {
    findActiveBySlugMock.mockResolvedValue(null);

    await service.scheduleTrigger("nonexistent", "12345", "promo");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("marks sent on sendMessage failure", async () => {
    findPendingScheduledMock.mockResolvedValue([
      { id: "p1", triggerSlug: "after-start", chatId: "12345", text: "Hello!", sendAt: new Date(), sentAt: null, createdAt: new Date() },
    ]);
    const sendError = new Error("send failed");

    await service.processPendingTriggers(async () => {
      throw sendError;
    });

    expect(markSentMock).toHaveBeenCalledWith("p1");
  });

  it("does not create duplicate pending scheduled message", async () => {
    findActiveBySlugMock.mockResolvedValue(mockTriggerMessage);
    findExistingScheduledMock.mockResolvedValue({ id: "existing" });

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });
});
