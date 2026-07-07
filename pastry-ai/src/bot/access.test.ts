import { describe, expect, it } from "vitest";
import { hasActiveTariffAccess } from "./access";

describe("bot access", () => {
  it("allows prompt access only for non-expired tariffs", () => {
    expect(
      hasActiveTariffAccess(
        { expiresAt: new Date("2026-07-01T00:00:00.000Z") },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects missing or expired tariffs", () => {
    expect(hasActiveTariffAccess(null)).toBe(false);
    expect(
      hasActiveTariffAccess(
        { expiresAt: new Date("2026-06-29T00:00:00.000Z") },
        new Date("2026-06-30T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
