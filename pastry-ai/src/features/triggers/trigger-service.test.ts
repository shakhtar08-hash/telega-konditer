import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTriggerService } from "./trigger-service";

describe("createTriggerService", () => {
  const mockTriggerMessage = {
    id: "1",
    slug: "after-start",
    title: "test",
    text: "Hello!",
    imageUrl: null,
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
    findActiveBySlugMock.mockResolvedValue([mockTriggerMessage]);
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
    findActiveBySlugMock.mockResolvedValue([mockTriggerMessage]);

    await service.scheduleTrigger("after-start", "12345", "pastry-chef");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("skips scheduling when trigger is not found", async () => {
    findActiveBySlugMock.mockResolvedValue([]);

    await service.scheduleTrigger("nonexistent", "12345", "promo");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });

  it("schedules multiple messages for the same slug", async () => {
    findActiveBySlugMock.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое сообщение",
        imageUrl: null,
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "t2",
        slug: "after-start",
        title: "60 мин",
        text: "Второе сообщение",
        imageUrl: null,
        delayMinutes: 60,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).toHaveBeenCalledTimes(2);
  });

  it("stores triggeredAt and sendAt per trigger message", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T17:00:00.000Z"));

    findActiveBySlugMock.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое",
        imageUrl: "/uploads/admin/triggers/first.webp",
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    findExistingScheduledMock.mockResolvedValue(null);

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerMessageId: "t1",
        triggerSlug: "after-start",
        triggeredAt: new Date("2026-07-10T17:00:00.000Z"),
        sendAt: new Date("2026-07-10T17:15:00.000Z"),
        imageUrl: "/uploads/admin/triggers/first.webp",
      }),
    );

    vi.useRealTimers();
  });

  it("marks sent on sendMessage failure", async () => {
    findPendingScheduledMock.mockResolvedValue([
      { id: "p1", triggerMessageId: "t1", triggerSlug: "after-start", chatId: "12345", text: "Hello!", imageUrl: null, triggeredAt: new Date(), sendAt: new Date(), sentAt: null, createdAt: new Date() },
    ]);
    const sendError = new Error("send failed");

    await service.processPendingTriggers(async () => {
      throw sendError;
    });

    expect(markSentMock).toHaveBeenCalledWith("p1");
  });

  it("does not create duplicate pending scheduled message per triggerMessageId + chatId", async () => {
    findActiveBySlugMock.mockResolvedValue([mockTriggerMessage]);
    findExistingScheduledMock.mockResolvedValue({ id: "existing" });

    await service.scheduleTrigger("after-start", "12345", "promo");

    expect(createScheduledMock).not.toHaveBeenCalled();
  });
});
