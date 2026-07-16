import { describe, expect, it } from "vitest";
import { parseDynamicUserGroupDefinition } from "./rule-validator";

describe("parseDynamicUserGroupDefinition", () => {
  it("accepts a flat AND definition with supported conditions", () => {
    expect(
      parseDynamicUserGroupDefinition({
        logicOperator: "AND",
        conditions: [
          { field: "promoClaimed", operator: "is", value: true },
          { field: "generationCount", operator: "gte", value: 3 },
          { field: "daysSinceSignup", operator: "lte", value: 30 },
        ],
      }),
    ).toEqual({
      logicOperator: "AND",
      conditions: [
        { field: "promoClaimed", operator: "is", value: true },
        { field: "generationCount", operator: "gte", value: 3 },
        { field: "daysSinceSignup", operator: "lte", value: 30 },
      ],
    });
  });

  it("rejects unsupported references to manual groups", () => {
    expect(
      parseDynamicUserGroupDefinition({
        logicOperator: "OR",
        conditions: [{ field: "manualGroupId", operator: "isMember", value: "vip" }],
      }),
    ).toBeNull();
  });
});
