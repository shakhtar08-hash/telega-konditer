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

import { buildPhotoStyleKeyboard, buildStartMessage } from "./start";

describe("buildStartMessage", () => {
  it("welcomes users by name", () => {
    expect(buildStartMessage("Chef")).toContain("Chef");
    expect(buildStartMessage("Chef")).toContain("Привет");
  });
});

describe("buildPhotoStyleKeyboard", () => {
  it("groups style buttons two per row", () => {
    const keyboard = buildPhotoStyleKeyboard([
      { id: "1", name: "Korean Cafe" },
      { id: "2", name: "Japanese" },
      { id: "3", name: "Coffee Mood" },
      { id: "4", name: "Royal" },
      { id: "5", name: "Wedding" },
    ]);

    expect(keyboard).toHaveLength(3);
    expect(keyboard[0]?.map((button) => button.text)).toEqual([
      "Korean Cafe",
      "Japanese",
    ]);
    expect(keyboard[1]?.map((button) => button.text)).toEqual([
      "Coffee Mood",
      "Royal",
    ]);
    expect(keyboard[2]?.map((button) => button.text)).toEqual(["Wedding"]);
  });
});
