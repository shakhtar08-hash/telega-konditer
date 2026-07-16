import { Bot, type StorageAdapter } from "grammy";
import { registerHelpCommand } from "./commands/help";
import { registerProfileCommand } from "./commands/profile";
import { registerStartCommand } from "./commands/start";
import type { BotSession, PastryBotContext } from "./context";
import { registerRecipeCardTextHandler, registerRecipeCardTemplateCallback, registerRecipeContextCallbacks } from "./handlers/recipe-card";
import { registerFreeLessonTextHandler } from "./handlers/free-lesson";
import { registerAskChefTextHandler } from "./handlers/ask-chef";
import { registerPhotoshootPhotoHandler } from "./handlers/photoshoot";
import { registerSingleStylePhotoshootHandler } from "./handlers/single-style-photoshoot";
import { registerRecipeTextHandler } from "./handlers/recipes";
import { registerTextPromptHandler } from "./handlers/text-prompt";
import { registerVisionPhotoHandler } from "./handlers/vision";
import { auth } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { sessionMiddleware } from "./middleware/session";
import { subscription } from "./middleware/subscription";

type BotDependencies = {
  token: string;
  userService: Parameters<typeof registerStartCommand>[1];
  photoshootService?: {
    generateStyledDessertPhotos(input: { imageUrl: string }): Promise<import("@/ai/schemas/photoshoot").PhotoshootOutput>;
    generateStyledDessertPhoto(input: { imageUrl: string; styleId: string }): Promise<import("@/ai/schemas/photoshoot").PhotoshootOutput>;
  };
  recipeService?: Parameters<typeof registerRecipeTextHandler>[1]["recipeService"];
  sessionStorage?: StorageAdapter<BotSession>;
  visionService?: Parameters<typeof registerVisionPhotoHandler>[1]["visionService"];
  freeLessonService?: Parameters<typeof registerFreeLessonTextHandler>[1]["freeLessonService"];
  askChefService?: Parameters<typeof registerAskChefTextHandler>[1]["askChefService"];
  recipeCardService?: Parameters<typeof registerRecipeCardTextHandler>[1]["recipeCardService"];
  textPromptService?: Parameters<typeof registerTextPromptHandler>[1]["textPromptService"];
  tokenGuard?: {
    getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
    ensureSufficientTokens(userId: string, required: number): Promise<void>;
    chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
  };
  aiService?: {
    generateImage(input: { provider: string; model: string; prompt: string; size?: string }): Promise<{ url: string }>;
  };
  generatedRecipeContextRepository?: Parameters<typeof registerRecipeTextHandler>[1]["generatedRecipeContextRepository"];
  conversationLogService?: {
    startConversation(input: { userId: string; feature: string }): Promise<string>;
    appendUserMessage(input: { conversationId: string; content: string; caption?: string }): Promise<void>;
    appendAssistantMessage(input: { conversationId: string; content: string; model?: string | null }): Promise<void>;
    appendErrorMessage(input: { conversationId: string; content: string }): Promise<void>;
  };
};

export function createPastryBot(
  dependencies: BotDependencies,
): Bot<PastryBotContext> {
  const bot = new Bot<PastryBotContext>(dependencies.token);

  bot.use(errorHandler());
  bot.use(logger());
  bot.use(sessionMiddleware(dependencies.sessionStorage));
  bot.use(auth());
  bot.use(subscription());

  registerStartCommand(bot, dependencies.userService);
  registerHelpCommand(bot);
  registerProfileCommand(bot);
  const conversationLog = dependencies.conversationLogService;
  if (dependencies.photoshootService) {
    registerPhotoshootPhotoHandler(bot, {
      botToken: dependencies.token,
      photoshootService: dependencies.photoshootService,
      tokenGuard: dependencies.tokenGuard!,
      conversationLogService: conversationLog,
    });
    registerSingleStylePhotoshootHandler(bot, {
      botToken: dependencies.token,
      photoshootService: dependencies.photoshootService,
      tokenGuard: dependencies.tokenGuard!,
      conversationLogService: conversationLog,
    });
  }
  if (dependencies.recipeService) {
    registerRecipeTextHandler(bot, {
      recipeService: dependencies.recipeService,
      generatedRecipeContextRepository: dependencies.generatedRecipeContextRepository!,
      conversationLogService: conversationLog,
    });
  }
  if (dependencies.visionService) {
    registerVisionPhotoHandler(bot, {
      botToken: dependencies.token,
      visionService: dependencies.visionService,
      conversationLogService: conversationLog,
    });
  }
  if (dependencies.freeLessonService) {
    registerFreeLessonTextHandler(bot, {
      freeLessonService: dependencies.freeLessonService,
      conversationLogService: conversationLog,
    });
  }
  if (dependencies.askChefService) {
    registerAskChefTextHandler(bot, {
      askChefService: dependencies.askChefService,
      conversationLogService: conversationLog,
    });
  }
  if (dependencies.recipeCardService) {
    registerRecipeCardTextHandler(bot, {
      recipeCardService: dependencies.recipeCardService,
      tokenGuard: dependencies.tokenGuard!,
    });
    registerRecipeCardTemplateCallback(bot, {
      recipeCardService: dependencies.recipeCardService,
      tokenGuard: dependencies.tokenGuard!,
    });
    registerRecipeContextCallbacks(bot, {
      recipeCardService: dependencies.recipeCardService,
      tokenGuard: dependencies.tokenGuard!,
      imageService: dependencies.aiService!,
      generatedRecipeContextRepository: dependencies.generatedRecipeContextRepository!,
    });
  }
  if (dependencies.textPromptService) {
    registerTextPromptHandler(bot, {
      textPromptService: dependencies.textPromptService,
      conversationLogService: conversationLog,
    });
  }

  return bot;
}
