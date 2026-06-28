import { describe, expect, it } from "vitest";
import { buildStartMessage } from "./start";

describe("buildStartMessage", () => {
  it("welcomes pastry chefs", () => {
    expect(buildStartMessage("Chef")).toContain("Chef");
    expect(buildStartMessage("Chef")).toContain("pastry");
  });
});
