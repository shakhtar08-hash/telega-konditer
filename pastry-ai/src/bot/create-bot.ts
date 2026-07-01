import { Bot } from "grammy";
import { registerHelpCommand } from "./commands/help";
import { registerProfileCommand } from "./commands/profile";
import { registerStartCommand } from "./commands/start";
import type { PastryBotContext } from "./context";
import { registerVisionPhotoHandler } from "./handlers/vision";
import { auth } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { logger } from "./middleware/logger";
import { sessionMiddleware } from "./middleware/session";
import { subscription } from "./middleware/subscription";

type BotDependencies = {
  token: string;
  userService: Parameters<typeof registerStartCommand>[1];
  visionService?: Parameters<typeof registerVisionPhotoHandler>[1]["visionService"];
};

export function createPastryBot(
  dependencies: BotDependencies,
): Bot<PastryBotContext> {
  const bot = new Bot<PastryBotContext>(dependencies.token);

  bot.use(errorHandler());
  bot.use(logger());
  bot.use(sessionMiddleware());
  bot.use(auth());
  bot.use(subscription());

  registerStartCommand(bot, dependencies.userService);
  registerHelpCommand(bot);
  registerProfileCommand(bot);
  if (dependencies.visionService) {
    registerVisionPhotoHandler(bot, {
      botToken: dependencies.token,
      visionService: dependencies.visionService,
    });
  }

  return bot;
}
