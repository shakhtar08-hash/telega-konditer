import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function logger(): MiddlewareFn<PastryBotContext> {
  return async (ctx, next) => {
    console.info("Telegram update", { updateId: ctx.update.update_id });
    await next();
  };
}
