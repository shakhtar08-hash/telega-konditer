import { Bot, type StorageAdapter } from "grammy";
import { registerHelpCommand } from "./commands/help";
import { registerProfileCommand } from "./commands/profile";
import { registerStartCommand } from "./commands/start";
import type { BotSession, PastryBotContext } from "./context";
import { registerPhotoshootPhotoHandler } from "./handlers/photoshoot";
import { registerSingleStylePhotoshootHandler } from "./handlers/single-style-photoshoot";
import { registerRecipeTextHandler } from "./handlers/recipes";
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
  recipeService?: Parameters<
    typeof registerRecipeTextHandler
  >[1]["recipeService"];
  sessionStorage?: StorageAdapter<BotSession>;
  visionService?: Parameters<typeof registerVisionPhotoHandler>[1]["visionService"];
  tokenGuard?: {
    getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number>;
    ensureSufficientTokens(userId: string, required: number): Promise<void>;
    chargeTokens(userId: string, feature: string, promptSlug: string | null, imagesSent: number): Promise<void>;
  };
  aiService?: Parameters<typeof registerRecipeTextHandler>[1]["imageService"];
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
  if (dependencies.photoshootService) {
    registerPhotoshootPhotoHandler(bot, {
      botToken: dependencies.token,
      photoshootService: dependencies.photoshootService,
      tokenGuard: dependencies.tokenGuard!,
    });
    registerSingleStylePhotoshootHandler(bot, {
      botToken: dependencies.token,
      photoshootService: dependencies.photoshootService,
      tokenGuard: dependencies.tokenGuard!,
    });
  }
  if (dependencies.recipeService) {
    registerRecipeTextHandler(bot, {
      recipeService: dependencies.recipeService,
      tokenGuard: dependencies.tokenGuard!,
      imageService: dependencies.aiService!,
    });
  }
  if (dependencies.visionService) {
    registerVisionPhotoHandler(bot, {
      botToken: dependencies.token,
      visionService: dependencies.visionService,
    });
  }

  return bot;
}
