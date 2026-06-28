import { session } from "grammy";
import type { BotSession, PastryBotContext } from "../context";

export function sessionMiddleware() {
  return session<BotSession, PastryBotContext>({
    initial: () => ({}),
  });
}
