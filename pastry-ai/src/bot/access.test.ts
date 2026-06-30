import { describe, expect, it } from "vitest";
import { hasUsableAccess } from "./access";

describe("bot access", () => {
  it("allows active subscriptions without expiration", () => {
    expect(hasUsableAccess({ expiresAt: null, status: "active" })).toBe(true);
  });

  it("allows active subscriptions that expire in the future", () => {
    expect(
      hasUsableAccess(
        { expiresAt: new Date("2026-07-01T00:00:00.000Z"), status: "active" },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects inactive or expired subscriptions", () => {
    expect(hasUsableAccess({ expiresAt: null, status: "pending" })).toBe(false);
    expect(
      hasUsableAccess(
        { expiresAt: new Date("2026-06-29T00:00:00.000Z"), status: "active" },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
