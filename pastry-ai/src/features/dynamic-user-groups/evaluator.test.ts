import { describe, expect, it } from "vitest";
import { matchesDynamicUserGroup } from "./evaluator";

describe("matchesDynamicUserGroup", () => {
  it("requires every condition for AND groups", () => {
    expect(
      matchesDynamicUserGroup(
        {
          logicOperator: "AND",
          conditions: [
            { field: "promoClaimed", operator: "is", value: true },
            { field: "generationCount", operator: "gte", value: 2 },
          ],
        },
        {
          promoClaimed: true,
          hasActiveTariff: false,
          tariffExpired: true,
          generationCount: 4,
          daysSinceLastActivity: 7,
          daysSinceSignup: 12,
          remainingTokens: 0,
        },
      ),
    ).toBe(true);
  });

  it("supports negative boolean conditions", () => {
    expect(
      matchesDynamicUserGroup(
        {
          logicOperator: "AND",
          conditions: [{ field: "hasActiveTariff", operator: "isNot", value: true }],
        },
        {
          promoClaimed: false,
          hasActiveTariff: false,
          tariffExpired: true,
          generationCount: 0,
          daysSinceLastActivity: 2,
          daysSinceSignup: 20,
          remainingTokens: 0,
        },
      ),
    ).toBe(true);
  });
});
