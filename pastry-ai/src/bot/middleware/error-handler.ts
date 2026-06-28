import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function errorHandler(): MiddlewareFn<PastryBotContext> {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error("Telegram handler failed", error);
      await ctx.reply("Something went wrong. Please try again.");
    }
  };
}
