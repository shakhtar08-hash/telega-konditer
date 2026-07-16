import { describe, expect, it } from "vitest";
import { checkRateLimit, getRateLimitKey } from "./rate-limit";

describe("rate-limit", () => {
  it("allows requests within limit", () => {
    const result = checkRateLimit("test-key-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests exceeding limit", () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns remaining count correctly", () => {
    const key = "test-key-3";
    const r1 = checkRateLimit(key, 10, 60_000);
    expect(r1.remaining).toBe(9);

    checkRateLimit(key, 10, 60_000);
    const r3 = checkRateLimit(key, 10, 60_000);
    expect(r3.remaining).toBe(7);
  });

  it("resets after window expires", async () => {
    const key = "test-key-4";
    checkRateLimit(key, 1, 10);
    expect(checkRateLimit(key, 1, 10).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 15));

    const result = checkRateLimit(key, 1, 10);
    expect(result.allowed).toBe(true);
  }, 10_000);

  it("derives key from x-forwarded-for header", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.42" },
    });
    expect(getRateLimitKey(req)).toBe("203.0.113.42");
  });

  it("falls back to unknown when no ip header", () => {
    const req = new Request("https://example.com");
    expect(getRateLimitKey(req)).toBe("unknown");
  });
});