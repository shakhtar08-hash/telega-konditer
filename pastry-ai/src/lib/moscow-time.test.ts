import { describe, expect, it } from "vitest";
import { parseMoscowDateTimeLocalValue } from "./moscow-time";

describe("parseMoscowDateTimeLocalValue", () => {
  it("converts a Moscow datetime-local value into the matching UTC instant", () => {
    expect(parseMoscowDateTimeLocalValue("2026-07-25T01:00")?.toISOString()).toBe(
      "2026-07-24T22:00:00.000Z",
    );
  });

  it("returns null for invalid datetime-local values", () => {
    expect(parseMoscowDateTimeLocalValue("2026-07-25 01:00")).toBeNull();
    expect(parseMoscowDateTimeLocalValue("")).toBeNull();
  });
});
