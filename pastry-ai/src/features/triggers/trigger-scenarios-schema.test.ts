import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("trigger scenarios schema", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  it("adds scenario models and trigger delivery fields", () => {
    expect(schema).toContain("model Scenario");
    expect(schema).toContain("model ScenarioStep");
    expect(schema).toContain("model ScenarioButton");
    expect(schema).toContain("deliveryType");
    expect(schema).toContain("scenarioId");
    expect(schema).toContain("scenarioStepId");
  });
});
