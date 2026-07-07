import type { Composer } from "grammy";
import type { InlineKeyboardButton } from "grammy/types";
import { userHasPromptAccess } from "../access";
import {
  clearScenarioSession,
  setActivePrompt,
  type PastryBotContext,
} from "../context";
import {
  buildExpiredTariffKeyboard,
  buildOnboardingKeyboard,
  buildPaymentUrl,
  getOnboardingStep,
  isPublicAppBaseUrl,
  loadExpiredTariffStep,
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
import { createTriggerService } from "@/features/triggers/trigger-service";
import { prisma } from "@/db/prisma";

type UserService = {
  registerTelegramUser(input: {
    telegramId: string;
    username?: string | null;
    name?: string | null;
  }): Promise<{ id: string; name?: string | null; telegramId: string; plan: "FREE" | "PRO" | "TEAM" }>;
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
    if (await isTariffExpired(ctx)) return;

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

    if (await isTariffExpired(ctx)) return;

    if (item.feature === "photoshoot-pick-style" || item.slug === "pick-style") {
      const { prisma } = await import("@/db/prisma");
      const styles = await prisma.photoStyle.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
        where: { active: true },
      });

      if (styles.length === 0) {
        await ctx.reply("Нет активных стилей. Создайте стили в админке.");
        return;
      }

      const keyboard: InlineKeyboardButton[][] = styles.map((style) => [
        {
          callback_data: `photoshoot-style:${style.id}`,
          text: style.name,
        },
      ]);

      await ctx.reply(
        "Вы выбрали: Фото по стилю\n\nВыберите визуальный стиль для обработки фото:",
        { reply_markup: { inline_keyboard: keyboard } },
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

  composer.callbackQuery(/^photoshoot-style:(.+)$/, async (ctx) => {
    const styleId = ctx.match[1];
    const { prisma } = await import("@/db/prisma");

    await ctx.answerCallbackQuery();

    const style = await prisma.photoStyle.findFirst({
      select: { name: true },
      where: { id: styleId, active: true },
    });

    if (!style) {
      await ctx.reply("Этот стиль больше недоступен. Выберите другой.");
      return;
    }

    clearScenarioSession(ctx.session);
    ctx.session.lastFeature = "photoshoot-single-style";
    ctx.session.selectedStyleId = styleId;

    await ctx.reply(
      `Вы выбрали стиль: ${style.name}\n\nТеперь отправьте фото десерта, и я обработаю его в этом стиле.`,
    );
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

    const triggerService = createTriggerService({
      findActiveBySlug: async (slug) =>
        prisma.triggerMessage.findFirst({
          where: { slug, active: true },
        }) as Promise<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
      createScheduled: async (data) =>
        prisma.scheduledMessage.create({ data }) as Promise<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
      findExistingScheduled: async (triggerSlug, chatId) =>
        prisma.scheduledMessage.findFirst({
          where: { triggerSlug, chatId, sentAt: null },
          select: { id: true },
        }),
      findPendingScheduled: async () => [],
      markSent: async () => {},
    });

    const userTariff = await prisma.userTariff.findUnique({
      where: { userId: user.id },
      select: { tariffPlan: { select: { slug: true } } },
    });
    const tariffSlug = userTariff?.tariffPlan?.slug ?? "promo";

    await triggerService.scheduleTrigger(
      "after-start",
      telegramId,
      tariffSlug,
    );

    if (await userHasPromptAccess(user.id)) {
      await sendPromptMenu(ctx);
      return;
    }

    await sendExpiredTariffMessage(ctx, telegramId);
    return;
  }

  await sendOnboardingStep(ctx, 0, telegramId);
}

async function sendExpiredTariffMessage(ctx: PastryBotContext, telegramId: string) {
  const step = await loadExpiredTariffStep();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const paymentUrl = buildPaymentUrl(baseUrl, telegramId);
  const buyButtonUrl = resolveBuyButtonUrl(step, paymentUrl, { baseUrl, telegramId });

  if (isPublicAppBaseUrl(baseUrl)) {
    const photoUrl = new URL(step.imagePath, baseUrl).toString();

    await ctx.replyWithPhoto(photoUrl, {
      caption: step.text,
      reply_markup: buildExpiredTariffKeyboard(buyButtonUrl, step),
    });
  } else {
    await ctx.reply(step.text, {
      reply_markup: buildExpiredTariffKeyboard(buyButtonUrl, step),
    });
  }
}

async function isTariffExpired(ctx: PastryBotContext): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const user = await prisma.user.findFirst({
    where: { telegramId: String(from.id) },
    select: { id: true },
  });

  if (!user) return false;

  const userTariff = await prisma.userTariff.findUnique({
    where: { userId: user.id },
    select: { expiresAt: true },
  });

  if (!userTariff) return false;

  if (userTariff.expiresAt > new Date()) return false;

  await sendExpiredTariffMessage(ctx, String(from.id));
  return true;
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
  const replyMarkup = buildOnboardingKeyboard(stepIndex, buyButtonUrl, steps);

  if (!isPublicAppBaseUrl(baseUrl)) {
    await ctx.reply(step.text, {
      reply_markup: replyMarkup,
    });
    return;
  }

  const photoUrl = new URL(step.imagePath, baseUrl).toString();

  await ctx.replyWithPhoto(photoUrl, {
    caption: step.text,
    reply_markup: replyMarkup,
  });
}

async function sendPromptMenu(ctx: PastryBotContext) {
  const items = await loadPromptMenuItems();

  if (items.length === 0) {
    await ctx.reply("Сейчас нет активных сценариев. Напишите администратору.");
    return;
  }

  await ctx.reply(await buildPromptMenuMessage(), {
    reply_markup: buildPromptMenuKeyboard(items),
  });
}
