import type { Composer } from "grammy";
import { Prisma, type ScheduledMessage, type TriggerRule } from "@prisma/client";
import { userHasPromptAccess } from "../access";
import { clearScenarioSession, setActivePrompt, type PastryBotContext } from "../context";
import { handleScenarioButtonCallback } from "../scenarios/callback-actions";
import { MENU_RETURN_CALLBACK } from "../menu-return";
import {
  buildExpiredTariffKeyboard,
  buildOnboardingKeyboard,
  buildPaymentUrl,
  getOnboardingStep,
  isPublicAppBaseUrl,
  loadExpiredTariffStep,
  loadOnboardingSteps,
  migrateLegacyStep,
  resolveBuyButtonUrl,
} from "../onboarding";
import {
  buildPhotoStyleKeyboard,
  executeBotCommandAction,
  handleTariffPurchase,
  openAskChefFlow,
  openBestRecipeFlow,
  openPhotoFlow,
  openRecipeFlow,
  openStylesFlow,
} from "../command-actions";
import {
  normalizeTariffPurchaseSlug,
  type TariffPurchaseSlug,
} from "@/features/payments/tariff-purchase";
import {
  buildPromptMenuKeyboard,
  buildPromptMenuMessage,
  findBotMenuItem,
  findPromptMenuItem,
  getPromptSelectionText,
  loadPromptMenuItems,
} from "../prompt-menu";
import { resolveTelegramPhotoInput } from "../telegram-media";
import { buildFeatureCookieBlock } from "@/features/tariffs/cookie-info";
import { createTriggerEventService } from "@/features/triggers/trigger-event-service";
import { sendScenarioStep } from "@/features/triggers/scenario-step-renderer";
import {
  type ScheduledMessageRecord,
  type TriggerMessageRecord,
  createTriggerService,
} from "@/features/triggers/trigger-service";
import { loadTriggerUserState } from "@/features/triggers/trigger-user-state";
import { prisma } from "@/db/prisma";

export { buildPhotoStyleKeyboard } from "../command-actions";

type UserService = {
  registerTelegramUser(input: {
    telegramId: string;
    username?: string | null;
    name?: string | null;
  }): Promise<{ id: string; name?: string | null; telegramId: string; plan: "FREE" | "PRO" | "TEAM" }>;
  assignPromoTariff(userId: string): Promise<unknown>;
};

type TriggerRuleWithScenario = TriggerRule & {
  scenario?: { startStepId: string | null } | null;
};

function toTriggerRuleRecord(rule: TriggerRuleWithScenario): TriggerMessageRecord {
  const record = {
    ...rule,
    buttons: rule.buttons,
    conditions: rule.conditions as TriggerMessageRecord["conditions"],
    delayUnit: rule.delayUnit as TriggerMessageRecord["delayUnit"],
    deliveryType: rule.deliveryType as TriggerMessageRecord["deliveryType"],
    scenarioId: rule.scenarioId,
    startStepId: rule.scenario?.startStepId ?? null,
    status: rule.status as TriggerMessageRecord["status"],
  } as TriggerMessageRecord & { startStepId: string | null };

  return record;
}

function toScheduledMessageRecord(
  scheduledMessage: ScheduledMessage,
): ScheduledMessageRecord {
  return {
    ...scheduledMessage,
    buttons: scheduledMessage.buttons,
  };
}

function toPrismaJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export function buildStartMessage(name: string): string {
  return `Привет, ${name}!`;
}

export function registerStartCommand(
  composer: Composer<PastryBotContext>,
  userService: UserService,
): void {
  composer.command("start", async (ctx) => {
    await sendAccessAwareEntryPoint(ctx, userService, {
      dispatchStartEvent: true,
    });
  });

  composer.command("menu", async (ctx) => {
    await sendAccessAwareEntryPoint(ctx, userService);
  });

  composer.command("recipe", async (ctx) => {
    await openRecipeFlow(ctx);
  });

  composer.command("bestrecipe", async (ctx) => {
    await openBestRecipeFlow(ctx);
  });

  composer.command("ask", async (ctx) => {
    await openAskChefFlow(ctx);
  });

  composer.command("photo", async (ctx) => {
    await openPhotoFlow(ctx);
  });

  composer.command("styles", async (ctx) => {
    await openStylesFlow(ctx);
  });

  composer.callbackQuery(/^onboarding:(\d+)$/, async (ctx) => {
    const step = Number(ctx.match[1]);
    const telegramId = ctx.from ? String(ctx.from.id) : "";
    const from = ctx.from;
    let shouldOpenMenu = false;

    await ctx.answerCallbackQuery();

    if (from) {
      const steps = await loadOnboardingSteps();
      const prevStep = getOnboardingStep(step - 1, steps);
      const migrated = migrateLegacyStep(prevStep);

      if (migrated.nextAction === "activate_promo_and_next") {
        shouldOpenMenu = true;
        const user = await prisma.user.findUnique({
          where: { telegramId: String(from.id) },
          select: { id: true, promoClaimed: true },
        });

        if (user && !user.promoClaimed) {
          await userService.assignPromoTariff(user.id);
          await prisma.user.update({
            where: { id: user.id },
            data: { promoClaimed: true },
          });
        }
      }
    }

    if (shouldOpenMenu) {
      await sendAccessAwareEntryPoint(ctx, userService);
      return;
    }

    await sendOnboardingStep(ctx, step, telegramId);
  });

  composer.callbackQuery(MENU_RETURN_CALLBACK, async (ctx) => {
    await answerCallbackQuerySafely(ctx);
    clearScenarioSession(ctx.session);
    const user =
      ctx.from
        ? await userService.registerTelegramUser({
            telegramId: String(ctx.from.id),
            username: ctx.from.username,
            name:
              [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") ||
              null,
          })
        : null;

    if (user && (await userHasPromptAccess(user.id))) {
      await sendPromptMenu(ctx);
    } else {
      await sendAccessAwareEntryPoint(ctx, userService);
    }
  });

  composer.callbackQuery(/^flow:(.+)$/, handleScenarioButtonCallback);

  composer.callbackQuery(/^funnel:command:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await executeBotCommandAction(ctx, ctx.match[1]);
  });

  composer.callbackQuery(/^prompt:([^:]+):(.+)$/, async (ctx) => {
    if (await isTariffExpired(ctx)) return;

    await ctx.answerCallbackQuery();
    await openScenarioBySlug(ctx, ctx.match[1], ctx.match[2]);
  });

  composer.callbackQuery(/^menu:(.+)$/, async (ctx) => {
    const item = await findBotMenuItem(ctx.match[1]);

    await ctx.answerCallbackQuery();

    if (!item) {
      await ctx.reply(
        "Эта кнопка сейчас недоступна. Откройте меню и выберите другой пункт.",
      );
      return;
    }

    if (await isTariffExpired(ctx)) return;

    await openScenarioFromItem(ctx, item);
  });

  composer.callbackQuery(/^photoshoot-style:(.+)$/, async (ctx) => {
    const styleId = ctx.match[1];
    const { prisma } = await import("@/db/prisma");

    await ctx.answerCallbackQuery();

    const style = await prisma.photoStyle.findFirst({
      select: { name: true, userPreview: true, userText: true },
      where: { id: styleId, active: true },
    });

    if (!style) {
      await ctx.reply("Этот стиль больше недоступен. Выберите другой.");
      return;
    }

    clearScenarioSession(ctx.session);
    ctx.session.lastFeature = "photoshoot-single-style";
    ctx.session.selectedStyleId = styleId;

    const userText = style.userText?.trim();
    const fallbackText = `Вы выбрали стиль: ${style.name}\n\nТеперь отправьте фото десерта, и я обработаю его в этом стиле.`;
    const styleMessage = userText || fallbackText;

    const userPreview = style.userPreview?.trim();
    if (userPreview) {
      await ctx.replyWithPhoto(resolveTelegramPhotoInput(userPreview), {
        caption: styleMessage,
      });
    } else {
      await ctx.reply(styleMessage);
    }
  });

  composer.callbackQuery("try_free", async (ctx) => {
    const from = ctx.from;
    if (!from) {
      await ctx.answerCallbackQuery();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: String(from.id) },
      select: { id: true },
    });

    if (!user) {
      await ctx.answerCallbackQuery();
      await ctx.reply("Нажмите /start, чтобы зарегистрироваться.");
      return;
    }

    await ctx.answerCallbackQuery();

    await userService.assignPromoTariff(user.id);

    await sendAccessAwareEntryPoint(ctx, userService);
  });

  composer.callbackQuery(/^tariff:buy:(basic|master|chief|pastry-chef|head-chef)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const tariffSlug = normalizeTariffPurchaseSlug(ctx.match[1]);

    if (!tariffSlug) {
      await ctx.reply("Не удалось определить тариф для оплаты.");
      return;
    }

    await handleTariffPurchase(ctx, {
      tariffSlug: tariffSlug as TariffPurchaseSlug,
    });
  });
}

function createRuntimeTriggerEventService() {
  const triggerService = createTriggerService({
    findActiveRulesByEvent: async (eventKey) => {
      const rules = await prisma.triggerRule.findMany({
        include: {
          scenario: {
            select: { startStepId: true },
          },
        },
        where: { eventKey, status: "active" },
        orderBy: [{ delayValue: "asc" }, { createdAt: "asc" }],
      });

      return rules.map(toTriggerRuleRecord);
    },
    createScheduled: async (data) =>
      toScheduledMessageRecord(
        await prisma.scheduledMessage.create({
          data: {
            ...data,
            buttons: toPrismaJsonValue(data.buttons),
          },
        }),
      ),
    findExistingScheduled: async (triggerRuleId, chatId, eventOccurredAt) =>
      prisma.scheduledMessage.findFirst({
        where: { triggerRuleId, chatId, triggeredAt: eventOccurredAt, sentAt: null },
        select: { id: true },
      }),
    findPendingScheduled: async () => [],
    markSent: async () => {},
  });

  return createTriggerEventService({
    loadTriggerUserState,
    scheduleTrigger: triggerService.scheduleTrigger,
  });
}

async function openScenarioBySlug(
  ctx: PastryBotContext,
  feature: string,
  slug: string,
) {
  const item = await findPromptMenuItem(feature, slug);

  if (!item) {
    await ctx.reply(
      "Этот сценарий сейчас недоступен. Откройте меню и выберите другой.",
    );
    return;
  }

  await openScenarioFromItem(ctx, item);
}

async function openScenarioFromItem(
  ctx: PastryBotContext,
  item: Awaited<ReturnType<typeof findBotMenuItem>>,
) {
  if (!item) return;

  if (item.actionType === "SCENARIO") {
    if (!item.scenarioId) {
      await ctx.reply(
        "Этот сценарий сейчас недоступен. Откройте меню и выберите другой пункт.",
      );
      return;
    }

    const scenario = await prisma.scenario.findUnique({
      select: { startStepId: true },
      where: { id: item.scenarioId },
    });

    if (!scenario?.startStepId) {
      await ctx.reply(
        "Этот сценарий сейчас недоступен. Откройте меню и выберите другой пункт.",
      );
      return;
    }

    clearScenarioSession(ctx.session);
    await sendScenarioStep(
      ctx,
      String(ctx.from?.id ?? ctx.chat?.id ?? ""),
      scenario.startStepId,
    );
    return;
  }

  setActivePrompt(
    ctx.session,
    (item.slug === "best-recipe-search" ? "best-recipe-search" : item.feature) as NonNullable<PastryBotContext["session"]["lastFeature"]>,
    item.slug,
  );

  ctx.session.processingText = item.processingText ?? undefined;

  const instructionText = item.instructionText?.trim();
  const baseMessage = instructionText || getPromptSelectionText(item);
  const cookieBlock = await buildSelectionCookieBlock(
    String(ctx.from?.id ?? ""),
    item.feature,
  );
  const fullText = `${baseMessage}\n\n${cookieBlock}`;

  const previewUrl = item.previewImageUrl?.trim();
  if (previewUrl) {
    await ctx.replyWithPhoto(resolveTelegramPhotoInput(previewUrl), {
      caption: fullText,
    });
  } else {
    await ctx.reply(fullText);
  }

  await showStyleKeyboardIfNeeded(ctx, item.feature, item.slug);
}

async function showStyleKeyboardIfNeeded(
  ctx: PastryBotContext,
  feature: string,
  slug: string,
) {
  if (feature !== "photoshoot-pick-style" && slug !== "pick-style") return;

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

  const keyboard = buildPhotoStyleKeyboard(styles);
  await ctx.reply("Выберите визуальный стиль для обработки фото:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function sendAccessAwareEntryPoint(
  ctx: PastryBotContext,
  userService: UserService,
  options?: {
    dispatchStartEvent?: boolean;
  },
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

    if (options?.dispatchStartEvent) {
      const triggerEventService = createRuntimeTriggerEventService();

      try {
        await triggerEventService.handleTriggerEvent("user.started", {
          userId: user.id,
          chatId: telegramId,
        });
      } catch (error) {
        console.error("Failed to dispatch user.started trigger event", {
          error,
          telegramId,
          userId: user.id,
        });
      }
    }

    const userTariff = await prisma.userTariff.findUnique({
      where: { userId: user.id },
      select: { tariffPlan: { select: { slug: true } } },
    });

    const tariffExists = userTariff !== null;

    if (await userHasPromptAccess(user.id)) {
      await sendPromptMenu(ctx);
      return;
    }

    if (tariffExists) {
      await sendExpiredTariffMessage(ctx, telegramId);
    } else {
      await sendOnboardingStep(ctx, 0, telegramId);
    }
    return;
  }

  await sendOnboardingStep(ctx, 0, telegramId);
}

async function sendExpiredTariffMessage(ctx: PastryBotContext, telegramId: string) {
  const step = await loadExpiredTariffStep();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const paymentUrl = buildPaymentUrl(baseUrl, telegramId);
  const buyButtonUrl = resolveBuyButtonUrl(step, paymentUrl, { baseUrl, telegramId });
  const replyMarkup = buildExpiredTariffKeyboard(buyButtonUrl, step);

  if (isPublicAppBaseUrl(baseUrl)) {
    await ctx.replyWithPhoto(resolveTelegramPhotoInput(step.imagePath), {
      caption: step.text,
      reply_markup: replyMarkup,
    });
  } else {
    await ctx.reply(step.text, {
      reply_markup: replyMarkup,
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
    select: { expiresAt: true, tariffPlan: { select: { tokenAmount: true } } },
  });

  if (!userTariff) return false;

  if (userTariff.expiresAt > new Date() && (userTariff.tariffPlan?.tokenAmount ?? 0) > 0) return false;

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

  await ctx.replyWithPhoto(resolveTelegramPhotoInput(step.imagePath), {
    caption: step.text,
    reply_markup: replyMarkup,
  });
}

async function buildSelectionCookieBlock(
  telegramId: string,
  feature: string,
): Promise<string> {
  const user = telegramId
    ? await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      })
    : null;

  let remainingTokens: number | null = null;
  if (user) {
    const tariff = await prisma.userTariff.findUnique({
      where: { userId: user.id },
      select: { remainingTokens: true },
    });
    remainingTokens = tariff?.remainingTokens ?? null;
  }

  const activeStyleCount =
    feature === "photoshoot"
      ? await prisma.photoStyle.count({ where: { active: true } })
      : 0;

  return buildFeatureCookieBlock(feature, activeStyleCount, remainingTokens);
}

async function sendPromptMenu(ctx: PastryBotContext) {
  const items = await loadPromptMenuItems();

  if (items.length === 0) {
    await sendTextMessage(ctx, "Сейчас нет активных сценариев. Напишите администратору.");
    return;
  }

  await sendTextMessage(ctx, await buildPromptMenuMessage(), {
    reply_markup: buildPromptMenuKeyboard(items),
  });
}

async function answerCallbackQuerySafely(ctx: PastryBotContext) {
  try {
    await ctx.answerCallbackQuery();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "description" in error &&
      typeof error.description === "string" &&
      /query is too old|query id is invalid/i.test(error.description)
    ) {
      console.warn("Ignoring stale Telegram callback query", {
        callbackData: "match" in ctx ? ctx.match : undefined,
        fromId: ctx.from?.id,
      });
      return;
    }

    throw error;
  }
}

async function sendTextMessage(
  ctx: PastryBotContext,
  text: string,
  other?: Parameters<PastryBotContext["reply"]>[1],
) {
  if (ctx.chat) {
    return ctx.reply(text, other);
  }

  if (ctx.from?.id) {
    return ctx.api.sendMessage(ctx.from.id, text, other);
  }

  throw new Error("Missing information for API call to sendMessage");
}
