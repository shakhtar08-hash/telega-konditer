import { describe, expect, it } from "vitest";
import { getPlanLabel, planAllowsPromptAccess } from "./plans";

describe("subscription plans", () => {
  it("maps internal plans to Russian subscription labels", () => {
    expect(getPlanLabel("FREE")).toBe("Без подписки");
    expect(getPlanLabel("PRO")).toBe("Базовый");
    expect(getPlanLabel("TEAM")).toBe("Продвинутый");
  });

  it("allows prompt access only for paid levels", () => {
    expect(planAllowsPromptAccess("FREE")).toBe(false);
    expect(planAllowsPromptAccess("PRO")).toBe(true);
    expect(planAllowsPromptAccess("TEAM")).toBe(true);
  });
});
