import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/prisma", () => ({
  prisma: {},
}));

vi.mock("@/features/triggers/trigger-service", () => ({
  createTriggerService: () => ({
    scheduleTrigger: vi.fn(),
    processPendingTriggers: vi.fn(),
  }),
}));

import {
  claimTelegramUpdate,
  getTelegramUpdateId,
  isValidTelegramSecret,
} from "./route";

describe("isValidTelegramSecret", () => {
  it("accepts matching secret token", () => {
    const request = new Request("https://example.com", {
      headers: { "x-telegram-bot-api-secret-token": "secret" },
    });

    expect(isValidTelegramSecret(request, "secret")).toBe(true);
  });

  it("rejects missing secret token", () => {
    const request = new Request("https://example.com");

    expect(isValidTelegramSecret(request, "secret")).toBe(false);
  });

  it("reads Telegram update id from webhook payloads", () => {
    expect(getTelegramUpdateId({ update_id: 123 })).toBe(123);
    expect(getTelegramUpdateId({ message: {} })).toBeNull();
  });

  it("claims Telegram updates once to prevent webhook retries from duplicating work", async () => {
    const claimedKeys = new Set<string>();
    const delegate = {
      create: async ({ data }: { data: { key: string } }) => {
        if (claimedKeys.has(data.key)) {
          throw { code: "P2002" };
        }

        claimedKeys.add(data.key);
      },
    };

    await expect(claimTelegramUpdate(delegate, 300442540)).resolves.toBe(true);
    await expect(claimTelegramUpdate(delegate, 300442540)).resolves.toBe(false);
  });
});
