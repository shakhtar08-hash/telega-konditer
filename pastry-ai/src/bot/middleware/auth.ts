import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function auth(): MiddlewareFn<PastryBotContext> {
  return async (_ctx, next) => next();
}
