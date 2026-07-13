import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessageMock = vi.hoisted(() => vi.fn());
const processPendingTriggersMock = vi.hoisted(() => vi.fn());
const createTriggerServiceMock = vi.hoisted(() => vi.fn(() => ({
  processPendingTriggers: processPendingTriggersMock,
})));
const loadEnvMock = vi.hoisted(() => vi.fn(() => ({
  CRON_SECRET: "cron-secret",
  TELEGRAM_BOT_TOKEN: "bot-token",
})));

vi.mock("@/lib/env", () => ({
  loadEnv: loadEnvMock,
}));

vi.mock("grammy", () => ({
  Bot: class {
    api = {
      sendMessage: sendMessageMock,
    };
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    scheduledMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    triggerRule: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/features/triggers/trigger-service", () => ({
  createTriggerService: createTriggerServiceMock,
}));

import { POST } from "./route";

describe("POST /api/cron/process-triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processPendingTriggersMock.mockResolvedValue(1);
    sendMessageMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a bearer token", async () => {
    const response = await POST(
      new Request("https://example.com/api/cron/process-triggers", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("uses the current trigger-rule repository contract and sends pending messages", async () => {
    const response = await POST(
      new Request("https://example.com/api/cron/process-triggers", {
        headers: {
          authorization: "Bearer cron-secret",
        },
        method: "POST",
      }),
    );

    expect(createTriggerServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        createScheduled: expect.any(Function),
        findActiveRulesByEvent: expect.any(Function),
        findExistingScheduled: expect.any(Function),
        findPendingScheduled: expect.any(Function),
        markSent: expect.any(Function),
      }),
    );
    expect(processPendingTriggersMock).toHaveBeenCalledTimes(1);

    const sendMessage = processPendingTriggersMock.mock.calls[0]?.[0];
    await sendMessage("12345", "Hello!");

    expect(sendMessageMock).toHaveBeenCalledWith("12345", "Hello!");
    await expect(response.json()).resolves.toEqual({ ok: true, sent: 1 });
  });
});
