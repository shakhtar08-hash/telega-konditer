import { describe, expect, it } from "vitest";
import { buildStartMessage } from "./start";

describe("buildStartMessage", () => {
  it("welcomes users by name", () => {
    expect(buildStartMessage("Chef")).toContain("Chef");
    expect(buildStartMessage("Chef")).toContain("Привет");
  });
});
