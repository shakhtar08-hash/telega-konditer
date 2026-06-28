import type { Composer } from "grammy";
import type { PastryBotContext } from "../context";

export function registerProfileCommand(
  composer: Composer<PastryBotContext>,
): void {
  composer.command("profile", async (ctx) => {
    await ctx.reply("Profile is ready for plan and credit tracking.");
  });
}
