import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessageMock = vi.hoisted(() => vi.fn());
const sendPhotoMock = vi.hoisted(() => vi.fn());
const sendScenarioStepMock = vi.hoisted(() => vi.fn());
const processPendingTriggersMock = vi.hoisted(() => vi.fn());
const createTriggerServiceMock = vi.hoisted(() => vi.fn(() => ({
  processPendingTriggers: processPendingTriggersMock,
})));
const loadEnvMock = vi.hoisted(() => vi.fn(() => ({
  APP_ROLE: "cron",
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
      sendPhoto: sendPhotoMock,
    };
  },
  InlineKeyboard: class {
    rows: Array<{ text: string; url: string }> = [];

    url(text: string, url: string) {
      this.rows.push({ text, url });
      return this;
    }

    row() {
      return this;
    }
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

vi.mock("@/features/triggers/scenario-step-renderer", () => ({
  sendScenarioStep: sendScenarioStepMock,
}));

import { POST } from "./route";

describe("POST /api/cron/process-triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadEnvMock.mockReturnValue({
      APP_ROLE: "cron",
      CRON_SECRET: "cron-secret",
      TELEGRAM_BOT_TOKEN: "bot-token",
    });
    processPendingTriggersMock.mockResolvedValue(1);
    sendMessageMock.mockResolvedValue(undefined);
    sendPhotoMock.mockResolvedValue(undefined);
  });

  it("rejects trigger processing on the app role", async () => {
    loadEnvMock.mockReturnValue({
      APP_ROLE: "app",
      CRON_SECRET: "cron-secret",
      TELEGRAM_BOT_TOKEN: "bot-token",
    });

    const response = await POST(
      new Request("https://example.com/api/cron/process-triggers", {
        headers: {
          authorization: "Bearer cron-secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(409);
    expect(createTriggerServiceMock).not.toHaveBeenCalled();
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
    await sendMessage("12345", "Hello!", {
      imageUrl: null,
      buttons: null,
    });

    expect(sendMessageMock).toHaveBeenCalledWith("12345", "Hello!", {
      reply_markup: undefined,
    });
    await expect(response.json()).resolves.toEqual({ ok: true, sent: 1 });
  });

  it("passes a scenario-step sender while preserving legacy message delivery", async () => {
    const response = await POST(
      new Request("https://example.com/api/cron/process-triggers", {
        headers: {
          authorization: "Bearer cron-secret",
        },
        method: "POST",
      }),
    );

    const sendScenario = processPendingTriggersMock.mock.calls[0]?.[1];
    expect(sendScenario).toEqual(expect.any(Function));

    await sendScenario("12345", "step_start");

    expect(sendScenarioStepMock).toHaveBeenCalledWith(
      expect.objectContaining({ api: expect.any(Object) }),
      "12345",
      "step_start",
    );
    await expect(response.json()).resolves.toEqual({ ok: true, sent: 1 });
  });

  it("sends photo messages with the queued image snapshot and URL buttons", async () => {
    const response = await POST(
      new Request("https://example.com/api/cron/process-triggers", {
        headers: {
          authorization: "Bearer cron-secret",
        },
        method: "POST",
      }),
    );

    const sendMessage = processPendingTriggersMock.mock.calls[0]?.[0];
    await sendMessage("12345", "Snapshot text", {
      imageUrl: "/uploads/admin/triggers/hero.webp",
      buttons: [
        { text: "Try free", type: "url", value: "https://example.com" },
      ],
    });

    expect(sendPhotoMock).toHaveBeenCalledWith(
      "12345",
      "http://localhost:3000/uploads/admin/triggers/hero.webp",
      expect.objectContaining({
        caption: "Snapshot text",
        reply_markup: expect.anything(),
      }),
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true, sent: 1 });
  });
});
