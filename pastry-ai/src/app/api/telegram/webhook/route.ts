import { webhookCallback } from "grammy";
import { createPastryBot } from "@/bot/create-bot";
import { loadEnv } from "@/lib/env";

export const runtime = "nodejs";

export function isValidTelegramSecret(
  request: Request,
  expectedSecret: string,
): boolean {
  return (
    request.headers.get("x-telegram-bot-api-secret-token") === expectedSecret
  );
}

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (!isValidTelegramSecret(request, env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [{ prisma }, { createUserRepository }, { createUserService }] =
    await Promise.all([
      import("@/db/prisma"),
      import("@/db/repositories/user-repository"),
      import("@/features/users/user-service"),
    ]);
  const userRepository = createUserRepository(prisma.user);
  const userService = createUserService({ userRepository });
  const bot = createPastryBot({
    token: env.TELEGRAM_BOT_TOKEN,
    userService,
  });

  return webhookCallback(bot, "std/http")(request);
}
