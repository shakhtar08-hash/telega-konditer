import type { Composer } from "grammy";
import type { PastryBotContext } from "../context";

type UserService = {
  registerTelegramUser(input: {
    telegramId: string;
    username?: string | null;
    name?: string | null;
  }): Promise<unknown>;
};

export function buildStartMessage(name: string): string {
  return `Welcome, ${name}. Send ingredients or a dessert photo to start your pastry workflow.`;
}

export function registerStartCommand(
  composer: Composer<PastryBotContext>,
  userService: UserService,
): void {
  composer.command("start", async (ctx) => {
    if (ctx.from) {
      await userService.registerTelegramUser({
        telegramId: String(ctx.from.id),
        username: ctx.from.username,
        name:
          [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") ||
          null,
      });
    }

    await ctx.reply(buildStartMessage(ctx.from?.first_name ?? "chef"));
  });
}
