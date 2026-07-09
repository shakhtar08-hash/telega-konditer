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

type TelegramUpdateClaimDelegate = {
  create(args: {
    data: {
      key: string;
      data: {
        claimedAt: string;
        updateId: number;
      };
    };
  }): Promise<unknown>;
};

export function getTelegramUpdateId(update: unknown): number | null {
  if (
    typeof update === "object" &&
    update !== null &&
    "update_id" in update &&
    typeof update.update_id === "number"
  ) {
    return update.update_id;
  }

  return null;
}

export async function claimTelegramUpdate(
  delegate: TelegramUpdateClaimDelegate,
  updateId: number,
): Promise<boolean> {
  try {
    await delegate.create({
      data: {
        key: `telegram-update:${updateId}`,
        data: {
          claimedAt: new Date().toISOString(),
          updateId,
        },
      },
    });

    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  const env = loadEnv();

  if (!isValidTelegramSecret(request, env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const updateId = getTelegramUpdateId(await request.clone().json().catch(() => null));

  const [
    { prisma },
    { createUserRepository },
    { createTariffPlanRepository },
    { createPromptRepository },
    { createUserService },
    { createPromptLoader },
    { createOpenAIAIService },
    { createPrismaSessionStorage },
    { createPhotoshootAgent },
    { createPhotoshootService },
    { createRecipeAgent },
    { createRecipeService },
    { createUserTariffRepository },
    { createTokenUsageRepository },
    { createTokenGuardService },
    { createVisionAgent },
    { createVisionService },
    { createFreeLessonAgent },
    { createFreeLessonService },
{ createAskChefAgent },
    { createAskChefService },
    { createRecipeCardAgent },
    { createRecipeCardService },
    { createTextPromptAgent },
    { createTextPromptService },
    { createGeneratedRecipeContextRepository },
  ] =
    await Promise.all([
      import("@/db/prisma"),
      import("@/db/repositories/user-repository"),
      import("@/db/repositories/tariff-plan-repository"),
      import("@/db/repositories/prompt-repository"),
      import("@/features/users/user-service"),
      import("@/ai/prompts/prompt-loader"),
      import("@/ai/provider/openai-provider"),
      import("@/bot/middleware/session"),
      import("@/ai/agents/photoshoot-agent"),
      import("@/features/photoshoot/photoshoot-service"),
      import("@/ai/agents/recipe-agent"),
      import("@/features/recipes/recipe-service"),
      import("@/db/repositories/user-tariff-repository"),
      import("@/db/repositories/token-usage-repository"),
      import("@/features/tariffs/token-guard-service"),
      import("@/ai/agents/vision-agent"),
      import("@/features/vision/vision-service"),
      import("@/ai/agents/free-lesson-agent"),
      import("@/features/free-lesson/free-lesson-service"),
      import("@/ai/agents/ask-chef-agent"),
      import("@/features/ask-chef/ask-chef-service"),
      import("@/ai/agents/recipe-card-agent"),
      import("@/features/recipe-card/recipe-card-service"),
      import("@/ai/agents/text-prompt-agent"),
      import("@/features/text-prompt/text-prompt-service"),
      import("@/db/repositories/generated-recipe-context-repository"),
    ]);

  if (updateId !== null) {
    const claimed = await claimTelegramUpdate(prisma.telegramSession, updateId);

    if (!claimed) {
      console.info("Skipping duplicate Telegram update", { updateId });

      return new Response("OK");
    }
  }

  const userRepository = createUserRepository(prisma.user);
  const tariffPlanRepository = createTariffPlanRepository(
    prisma.tariffPlan as never,
  );
  const promptRepository = createPromptRepository(prisma.prompt);
  const promptLoader = createPromptLoader(promptRepository);
  const aiService = createOpenAIAIService();
  const sessionStorage = createPrismaSessionStorage(prisma.telegramSession);
  const userTariffRepository = createUserTariffRepository(prisma.userTariff as never);
  const userService = createUserService({
    userRepository,
    tariffPlanRepository,
    userTariffRepository,
  });
  const tokenUsageRepository = createTokenUsageRepository(prisma.tokenUsage as never);
  const tokenGuard = createTokenGuardService(userTariffRepository, tokenUsageRepository);
  const photoshootAgent = createPhotoshootAgent({ aiService, promptLoader });
  const photoshootService = createPhotoshootService({
photoStyleRepository: {
      listActive: () =>
        prisma.photoStyle.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            prompt: true,
            provider: true,
            model: true,
          },
          where: {
            active: true,
          },
        }),
      findById: (id) =>
        prisma.photoStyle.findFirst({
          where: { id },
          select: {
            id: true,
            name: true,
            prompt: true,
            provider: true,
            model: true,
          },
        }),
    },
    photoshootAgent,
  });
  const recipeAgent = createRecipeAgent({ aiService, promptLoader });
  const recipeService = createRecipeService({ recipeAgent });
  const visionAgent = createVisionAgent({ aiService, promptLoader });
  const visionService = createVisionService({ visionAgent });
  const freeLessonAgent = createFreeLessonAgent({ aiService, promptLoader });
  const freeLessonService = createFreeLessonService({ freeLessonAgent });
  const askChefAgent = createAskChefAgent({ aiService, promptLoader });
  const askChefService = createAskChefService({ askChefAgent });
  const recipeCardAgent = createRecipeCardAgent({ aiService, promptLoader });
  const recipeCardService = createRecipeCardService({ recipeCardAgent, aiService });
  const textPromptAgent = createTextPromptAgent({ aiService, promptLoader });
  const textPromptService = createTextPromptService({ textPromptAgent });
  const generatedRecipeContextRepository = createGeneratedRecipeContextRepository(
    prisma.generatedRecipeContext as never,
  );
  const bot = createPastryBot({
    token: env.TELEGRAM_BOT_TOKEN,
    userService,
    photoshootService,
    recipeService,
    sessionStorage,
    visionService,
    freeLessonService,
    askChefService,
    recipeCardService,
    textPromptService,
    tokenGuard,
    aiService,
    generatedRecipeContextRepository,
  });

  return webhookCallback(bot, "std/http")(request);
}
