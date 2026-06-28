import { describe, expect, it } from "vitest";
import { isValidTelegramSecret } from "./route";

describe("isValidTelegramSecret", () => {
  it("accepts matching secret token", () => {
    const request = new Request("https://example.com", {
      headers: { "x-telegram-bot-api-secret-token": "secret" },
    });

    expect(isValidTelegramSecret(request, "secret")).toBe(true);
  });

  it("rejects missing secret token", () => {
    const request = new Request("https://example.com");

    expect(isValidTelegramSecret(request, "secret")).toBe(false);
  });
});
