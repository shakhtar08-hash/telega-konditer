import { describe, expect, it } from "vitest";
import { sanitizeOutboundPrompt } from "./ai-request-sanitizer";

describe("sanitizeOutboundPrompt", () => {
  it("normalizes multiline prompt noise without changing content meaning", () => {
    expect(
      sanitizeOutboundPrompt("  dessert  \n\nwith   berries   and cream  "),
    ).toBe("dessert with berries and cream");
  });
});
