import type { MiddlewareFn } from "grammy";
import type { PastryBotContext } from "../context";

export function subscription(): MiddlewareFn<PastryBotContext> {
  return async (_ctx, next) => next();
}
