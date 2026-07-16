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
      RENDER_CARD_SECRET: "render-card-secret",
    });

    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  it("throws for missing required values", () => {
    expect(() => loadEnv({})).toThrow("Invalid environment");
  });
});

describe("loadEnv transition config", () => {
  it("starts without Supabase variables when core app config is present", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
    });

    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  it("parses optional internal routing variables", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
      INTERNAL_API_BASE_URL: "http://ru-app:3000",
      INTERNAL_API_SHARED_SECRET: "shared-secret",
      INTERNAL_TELEGRAM_INGRESS_URL: "http://ru-app:3000/api/internal/telegram",
      INTERNAL_AI_GATEWAY_URL: "http://ru-app:3000/api/internal/ai",
      APP_REGION: "ru",
      APP_ROLE: "app",
    });

    expect(env.INTERNAL_API_SHARED_SECRET).toBe("shared-secret");
    expect(env.APP_REGION).toBe("ru");
  });
});
