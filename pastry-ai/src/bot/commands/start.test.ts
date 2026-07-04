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

import { buildStartMessage } from "./start";

describe("buildStartMessage", () => {
  it("welcomes users by name", () => {
    expect(buildStartMessage("Chef")).toContain("Chef");
    expect(buildStartMessage("Chef")).toContain("Привет");
  });
});
