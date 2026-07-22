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
  it("allows ingress role to load without database urls", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
      APP_ROLE: "ingress",
      APP_REGION: "eu",
    });

    expect(env.APP_ROLE).toBe("ingress");
    expect(env.DATABASE_URL).toBeUndefined();
  });

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

  it("rejects app role without a database url", () => {
    expect(() =>
      loadEnv({
        OPENAI_API_KEY: "openai-key",
        TELEGRAM_BOT_TOKEN: "telegram-token",
        TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
        CRON_SECRET: "cron-secret",
        APP_ROLE: "app",
        APP_REGION: "ru",
      }),
    ).toThrow("Invalid environment");
  });

  it("rejects cron role without a database url", () => {
    expect(() =>
      loadEnv({
        OPENAI_API_KEY: "openai-key",
        TELEGRAM_BOT_TOKEN: "telegram-token",
        TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
        CRON_SECRET: "cron-secret",
        APP_ROLE: "cron",
        APP_REGION: "ru",
      }),
    ).toThrow("Invalid environment");
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

  it("treats empty optional transition variables as unset", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      OPENROUTER_API_KEY: "",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      DIRECT_URL: "",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      APP_BASE_URL: "",
      CLOUDPAYMENTS_PUBLIC_ID: "",
      CLOUDPAYMENTS_API_SECRET: "",
      YOOKASSA_SHOP_ID: "",
      YOOKASSA_SECRET_KEY: "",
      YOOKASSA_HEAD_CHEF_AMOUNT_RUB: "",
      CRON_SECRET: "cron-secret",
      RENDER_CARD_SECRET: "",
      YOUTUBE_API_KEY: "",
      INTERNAL_API_BASE_URL: "",
      INTERNAL_API_SHARED_SECRET: "",
      INTERNAL_TELEGRAM_INGRESS_URL: "",
      INTERNAL_AI_GATEWAY_URL: "",
    });

    expect(env.OPENROUTER_API_KEY).toBeUndefined();
    expect(env.DIRECT_URL).toBeUndefined();
    expect(env.INTERNAL_API_SHARED_SECRET).toBeUndefined();
    expect(env.YOOKASSA_SHOP_ID).toBeUndefined();
    expect(env.YOOKASSA_SECRET_KEY).toBeUndefined();
    expect(env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB).toBeUndefined();
  });

  it("parses YooKassa configuration when provided", () => {
    const env = loadEnv({
      OPENAI_API_KEY: "openai-key",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
      CRON_SECRET: "cron-secret",
      YOOKASSA_SHOP_ID: "shop-id",
      YOOKASSA_SECRET_KEY: "secret-key",
      YOOKASSA_HEAD_CHEF_AMOUNT_RUB: "2490",
    });

    expect(env.YOOKASSA_SHOP_ID).toBe("shop-id");
    expect(env.YOOKASSA_SECRET_KEY).toBe("secret-key");
    expect(env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB).toBe("2490");
  });

  it("rejects partially configured Supabase settings", () => {
    expect(() =>
      loadEnv({
        OPENAI_API_KEY: "openai-key",
        SUPABASE_URL: "https://example.supabase.co",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
        TELEGRAM_BOT_TOKEN: "telegram-token",
        TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
        CRON_SECRET: "cron-secret",
      }),
    ).toThrow("Invalid environment");
  });

  it("rejects invalid transition region values", () => {
    expect(() =>
      loadEnv({
        OPENAI_API_KEY: "openai-key",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
        TELEGRAM_BOT_TOKEN: "telegram-token",
        TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
        CRON_SECRET: "cron-secret",
        APP_REGION: "us",
      }),
    ).toThrow("Invalid environment");
  });

  it("rejects malformed YooKassa head-chef amounts", () => {
    expect(() =>
      loadEnv({
        OPENAI_API_KEY: "openai-key",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
        TELEGRAM_BOT_TOKEN: "telegram-token",
        TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
        CRON_SECRET: "cron-secret",
        YOOKASSA_HEAD_CHEF_AMOUNT_RUB: "abc",
      }),
    ).toThrow(
      "Invalid environment: YOOKASSA_HEAD_CHEF_AMOUNT_RUB must be a positive payment amount",
    );
  });

  it("rejects non-positive YooKassa head-chef amounts", () => {
    expect(() =>
      loadEnv({
        OPENAI_API_KEY: "openai-key",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/pastry",
        TELEGRAM_BOT_TOKEN: "telegram-token",
        TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
        CRON_SECRET: "cron-secret",
        YOOKASSA_HEAD_CHEF_AMOUNT_RUB: "-10",
      }),
    ).toThrow(
      "Invalid environment: YOOKASSA_HEAD_CHEF_AMOUNT_RUB must be a positive payment amount",
    );
  });
});
