import type { Composer } from "grammy";
import { userHasPromptAccess } from "../access";
import {
  clearScenarioSession,
  setActivePrompt,
  type PastryBotContext,
} from "../context";
import {
  buildOnboardingKeyboard,
  buildPaymentUrl,
  getOnboardingStep,
  loadOnboardingSteps,
  resolveBuyButtonUrl,
} from "../onboarding";
import {
  buildPromptMenuKeyboard,
  buildPromptMenuMessage,
  findBotMenuItem,
  findPromptMenuItem,
  getPromptSelectionText,
  loadPromptMenuItems,
} from "../prompt-menu";

type UserService = {
  registerTelegramUser(input: {
    telegramId: string;
    username?: string | null;
    name?: string | null;
  }): Promise<{ id: string; name?: string | null; telegramId: string }>;
};

export function buildStartMessage(name: string): string {
  return `Привет, ${name}!`;
}

export function registerStartCommand(
  composer: Composer<PastryBotContext>,
  userService: UserService,
): void {
  composer.command("start", async (ctx) => {
    await sendAccessAwareEntryPoint(ctx, userService);
  });

  composer.command("menu", async (ctx) => {
    await sendAccessAwareEntryPoint(ctx, userService);
  });

  composer.callbackQuery(/^onboarding:(\d+)$/, async (ctx) => {
    const step = Number(ctx.match[1]);
    const telegramId = ctx.from ? String(ctx.from.id) : "";

    await ctx.answerCallbackQuery();
    await sendOnboardingStep(ctx, step, telegramId);
  });

  composer.callbackQuery(/^prompt:([^:]+):(.+)$/, async (ctx) => {
    const feature = ctx.match[1];
    const slug = ctx.match[2];
    const item = await findPromptMenuItem(feature, slug);

    await ctx.answerCallbackQuery();

    if (!item) {
      await ctx.reply(
        "Этот сценарий сейчас недоступен. Откройте меню и выберите другой.",
      );
      return;
    }

    setActivePrompt(
      ctx.session,
      item.feature as NonNullable<PastryBotContext["session"]["lastFeature"]>,
      item.slug,
    );

    await ctx.reply(getPromptSelectionText(item));
  });

  composer.callbackQuery(/^menu:(.+)$/, async (ctx) => {
    const buttonId = ctx.match[1];
    const item = await findBotMenuItem(buttonId);

    await ctx.answerCallbackQuery();

    if (!item) {
      await ctx.reply(
        "Эта кнопка сейчас недоступна. Откройте меню и выберите другой пункт.",
      );
      return;
    }

    setActivePrompt(
      ctx.session,
      item.feature as NonNullable<PastryBotContext["session"]["lastFeature"]>,
      item.slug,
    );

    await ctx.reply(getPromptSelectionText(item));
  });
}

async function sendAccessAwareEntryPoint(
  ctx: PastryBotContext,
  userService: UserService,
) {
  clearScenarioSession(ctx.session);

  let telegramId = ctx.from ? String(ctx.from.id) : "";

  if (ctx.from) {
    const user = await userService.registerTelegramUser({
      telegramId: String(ctx.from.id),
      username: ctx.from.username,
      name:
        [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") ||
        null,
    });
    telegramId = user.telegramId;

    if (await userHasPromptAccess(user.id)) {
      await sendPromptMenu(ctx);
      return;
    }
  }

  await sendOnboardingStep(ctx, 0, telegramId);
}

async function sendOnboardingStep(
  ctx: PastryBotContext,
  stepIndex: number,
  telegramId: string,
) {
  const steps = await loadOnboardingSteps();
  const step = getOnboardingStep(stepIndex, steps);
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const paymentUrl = buildPaymentUrl(baseUrl, telegramId);
  const buyButtonUrl = resolveBuyButtonUrl(step, paymentUrl, { baseUrl, telegramId });
  const photoUrl = new URL(step.imagePath, baseUrl).toString();

  await ctx.replyWithPhoto(photoUrl, {
    caption: step.text,
    reply_markup: buildOnboardingKeyboard(stepIndex, buyButtonUrl, steps),
  });
}

async function sendPromptMenu(ctx: PastryBotContext) {
  const items = await loadPromptMenuItems();

  if (items.length === 0) {
    await ctx.reply("Сейчас нет активных сценариев. Напишите администратору.");
    return;
  }

  await ctx.reply(buildPromptMenuMessage(), {
    reply_markup: buildPromptMenuKeyboard(items),
  });
}
