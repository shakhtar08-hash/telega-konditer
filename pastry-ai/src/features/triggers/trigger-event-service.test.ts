import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTriggerEventService } from "./trigger-event-service";

describe("createTriggerEventService", () => {
  const loadTriggerUserStateMock = vi.fn();
  const scheduleTriggerMock = vi.fn();

  const service = createTriggerEventService({
    loadTriggerUserState: loadTriggerUserStateMock,
    scheduleTrigger: scheduleTriggerMock,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    expect(loadTriggerUserStateMock).toHaveBeenCalledWith("user_1");
    expect(scheduleTriggerMock).toHaveBeenCalledWith(
      "user.started",
      "12345",
      expect.objectContaining({ promoClaimed: false }),
      new Date("2026-07-13T10:00:00.000Z"),
    );
  });
});
