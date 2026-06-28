import type { Composer } from "grammy";
import type { PastryBotContext } from "../context";

export function buildHelpMessage(): string {
  return [
    "Available commands:",
    "/start - register and begin",
    "/profile - show your profile",
    "Send ingredients like: eggs, butter, flour",
  ].join("\n");
}

export function registerHelpCommand(composer: Composer<PastryBotContext>): void {
  composer.command("help", async (ctx) => {
    await ctx.reply(buildHelpMessage());
  });
}
