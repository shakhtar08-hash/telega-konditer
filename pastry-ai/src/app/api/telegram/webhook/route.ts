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

  const [
    { prisma },
    { createUserRepository },
    { createPromptRepository },
    { createUserService },
    { createPromptLoader },
    { createOpenAIAIService },
    { createVisionAgent },
    { createVisionService },
  ] =
    await Promise.all([
      import("@/db/prisma"),
      import("@/db/repositories/user-repository"),
      import("@/db/repositories/prompt-repository"),
      import("@/features/users/user-service"),
      import("@/ai/prompts/prompt-loader"),
      import("@/ai/provider/openai-provider"),
      import("@/ai/agents/vision-agent"),
      import("@/features/vision/vision-service"),
    ]);
  const userRepository = createUserRepository(prisma.user);
  const promptRepository = createPromptRepository(prisma.prompt);
  const promptLoader = createPromptLoader(promptRepository);
  const aiService = createOpenAIAIService();
  const userService = createUserService({ userRepository });
  const visionAgent = createVisionAgent({ aiService, promptLoader });
  const visionService = createVisionService({ visionAgent });
  const bot = createPastryBot({
    token: env.TELEGRAM_BOT_TOKEN,
    userService,
    visionService,
  });

  return webhookCallback(bot, "std/http")(request);
}
