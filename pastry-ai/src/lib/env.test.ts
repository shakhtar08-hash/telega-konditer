import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses required application environment", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
    });

    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  it("throws for missing required values", () => {
    expect(() => loadEnv({})).toThrow("Invalid environment");
  });
});
