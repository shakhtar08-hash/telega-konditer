import { z } from "zod";
import { resolveAppRole } from "@/lib/app-role";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrlString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

function isPositivePaymentAmount(value: string) {
  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0;
}

function formatEnvError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join("; ");
}

const envSchema = z
  .object({
  OPENAI_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: optionalNonEmptyString,
  SUPABASE_URL: optionalUrlString,
  SUPABASE_ANON_KEY: optionalNonEmptyString,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  DATABASE_URL: optionalNonEmptyString,
  DIRECT_URL: optionalNonEmptyString,
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  ADMIN_USERNAME: optionalNonEmptyString,
  ADMIN_PASSWORD: optionalNonEmptyString,
  ADMIN_SESSION_SECRET: optionalNonEmptyString,
  APP_BASE_URL: optionalUrlString,
  CLOUDPAYMENTS_PUBLIC_ID: optionalNonEmptyString,
  CLOUDPAYMENTS_API_SECRET: optionalNonEmptyString,
  YOOKASSA_SHOP_ID: optionalNonEmptyString,
  YOOKASSA_SECRET_KEY: optionalNonEmptyString,
  YOOKASSA_HEAD_CHEF_AMOUNT_RUB: optionalNonEmptyString,
  CRON_SECRET: z.string().min(1),
  RENDER_CARD_SECRET: optionalNonEmptyString,
  YOUTUBE_API_KEY: optionalNonEmptyString,
  INTERNAL_API_BASE_URL: optionalUrlString,
  INTERNAL_API_SHARED_SECRET: optionalNonEmptyString,
  INTERNAL_TELEGRAM_INGRESS_URL: optionalUrlString,
  INTERNAL_AI_GATEWAY_URL: optionalUrlString,
  APP_REGION: z.enum(["eu", "ru"]).optional(),
  APP_ROLE: z.enum(["ingress", "app", "cron"]).optional(),
  })
  .superRefine((env, ctx) => {
    const resolvedRole = resolveAppRole(env.APP_ROLE);
    const supabaseValues = [
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      env.SUPABASE_SERVICE_ROLE_KEY,
    ];
    const configuredSupabaseValues = supabaseValues.filter(
      (value) => value !== undefined,
    ).length;

    if (
      configuredSupabaseValues !== 0 &&
      configuredSupabaseValues !== supabaseValues.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be configured together",
        path: ["SUPABASE_URL"],
      });
    }

    if (resolvedRole !== "ingress" && env.DATABASE_URL === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL is required unless APP_ROLE=ingress",
        path: ["DATABASE_URL"],
      });
    }

    if (
      env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB !== undefined &&
      !isPositivePaymentAmount(env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "YOOKASSA_HEAD_CHEF_AMOUNT_RUB must be a positive payment amount",
        path: ["YOOKASSA_HEAD_CHEF_AMOUNT_RUB"],
      });
    }
  });

type TransitionAppEnv = z.infer<typeof envSchema>;

export type AppEnv = TransitionAppEnv;
export type SupabaseAppEnv = TransitionAppEnv & {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

function hasSupabaseConfig(env: TransitionAppEnv): env is SupabaseAppEnv {
  return (
    env.SUPABASE_URL !== undefined &&
    env.SUPABASE_ANON_KEY !== undefined &&
    env.SUPABASE_SERVICE_ROLE_KEY !== undefined
  );
}

export function loadEnv(): SupabaseAppEnv;
export function loadEnv(source: Record<string, string | undefined>): AppEnv;

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): AppEnv | SupabaseAppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${formatEnvError(parsed.error)}`);
  }

  if (arguments.length === 0) {
    if (!hasSupabaseConfig(parsed.data)) {
      throw new Error(
        "Invalid environment: SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required when loading process.env",
      );
    }
  }

  return parsed.data;
}

export function requireDatabaseUrl(env: AppEnv, consumer: string): string {
  if (!env.DATABASE_URL) {
    throw new Error(`${consumer} requires DATABASE_URL`);
  }

  return env.DATABASE_URL;
}

const yookassaHeadChefAmountSchema = z
  .object({
    YOOKASSA_HEAD_CHEF_AMOUNT_RUB: optionalNonEmptyString,
  })
  .superRefine((env, ctx) => {
    if (
      env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB !== undefined &&
      !isPositivePaymentAmount(env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "YOOKASSA_HEAD_CHEF_AMOUNT_RUB must be a positive payment amount",
        path: ["YOOKASSA_HEAD_CHEF_AMOUNT_RUB"],
      });
    }
  });

export function requireYooKassaHeadChefAmountRub(
  source: Record<string, string | undefined> = process.env,
): number {
  const parsed = yookassaHeadChefAmountSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${formatEnvError(parsed.error)}`);
  }

  if (parsed.data.YOOKASSA_HEAD_CHEF_AMOUNT_RUB === undefined) {
    throw new Error("YOOKASSA_HEAD_CHEF_AMOUNT_RUB is required");
  }

  return Number(parsed.data.YOOKASSA_HEAD_CHEF_AMOUNT_RUB);
}
