import type { InlineKeyboardButton, InlineKeyboardMarkup } from "grammy/types";
import { clearScenarioSession, setActivePrompt, type PastryBotContext } from "./context";
import {
  buildPromptMenuKeyboard,
  buildPromptMenuMessage,
  findPromptMenuItem,
  getPromptSelectionText,
  loadPromptMenuItems,
  type PromptMenuItem,
} from "./prompt-menu";
import {
  buildExpiredTariffKeyboard,
  buildPaymentUrl,
  isPublicAppBaseUrl,
  loadExpiredTariffStep,
  resolveBuyButtonUrl,
} from "./onboarding";
import { buildFeatureCookieBlock } from "@/features/tariffs/cookie-info";
import {
  buildTariffPurchaseCallbackData,
  parseTariffPurchaseCallbackData,
  type TariffPurchaseSlug,
} from "@/features/payments/tariff-purchase";
import { prisma } from "@/db/prisma";
import { resolveTelegramPhotoInput } from "./telegram-media";

export async function executeBotCommandAction(
  ctx: PastryBotContext,
  command: string,
): Promise<void> {
  switch (command) {
    case "/menu":
      return openMainMenu(ctx);
    case "/recipe":
      return openRecipeFlow(ctx);
    case "/bestrecipe":
      return openBestRecipeFlow(ctx);
    case "/ask":
      return openAskChefFlow(ctx);
    case "/photo":
      return openPhotoFlow(ctx);
    case "/styles":
      return openStylesFlow(ctx);
    default:
      throw new Error(`Unknown bot command action: ${command}`);
  }
}

export async function openMainMenu(ctx: PastryBotContext): Promise<void> {
  clearScenarioSession(ctx.session);
  await sendPromptMenu(ctx);
}

export async function openRecipeFlow(ctx: PastryBotContext): Promise<void> {
  if (await isTariffExpired(ctx)) return;
  await openScenarioBySlug(ctx, "recipes", "recipe-from-ingredients");
}

export async function openBestRecipeFlow(ctx: PastryBotContext): Promise<void> {
  if (await isTariffExpired(ctx)) return;
  await openScenarioBySlug(ctx, "best-recipe-search", "best-recipe-search");
}

export async function openAskChefFlow(ctx: PastryBotContext): Promise<void> {
  if (await isTariffExpired(ctx)) return;
  await openScenarioBySlug(ctx, "ask-chef", "ask-chef");
}

export async function openPhotoFlow(ctx: PastryBotContext): Promise<void> {
  if (await isTariffExpired(ctx)) return;
  await openScenarioBySlug(ctx, "photoshoot", "product-photo");
}

export async function openStylesFlow(ctx: PastryBotContext): Promise<void> {
  if (await isTariffExpired(ctx)) return;
  await openScenarioBySlug(ctx, "photoshoot-pick-style", "pick-style");
}

export async function openScenarioBySlug(
  ctx: PastryBotContext,
  feature: string,
  slug: string,
): Promise<void> {
  const item = await findPromptMenuItem(feature, slug);

  if (!item) {
    await ctx.reply(
      "Этот сценарий сейчас недоступен. Откройте меню и выберите другой.",
    );
    return;
  }

  await openScenarioFromItem(ctx, item);
}

export async function openScenarioFromItem(
  ctx: PastryBotContext,
  item: PromptMenuItem | null,
): Promise<void> {
  if (!item) return;

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

export async function handleTariffPurchase(
  ctx: PastryBotContext,
  input: {
    tariffSlug: TariffPurchaseSlug;
  },
): Promise<string | null> {
  const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

  if (!telegramId) {
    await ctx.reply("Нажмите /start, чтобы продолжить оплату.");
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { telegramId },
    select: { id: true },
  });

  if (!user) {
    await ctx.reply("Нажмите /start, чтобы продолжить оплату.");
    return null;
  }

  try {
    const response = await fetch(
      new URL("/api/payments/yookassa/create", getInternalApiBaseUrl()).toString(),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          tariffSlug: input.tariffSlug,
          returnUrl: new URL("/payments/return", getPublicAppBaseUrl()).toString(),
        }),
      },
    );
    const payload = (await response.json()) as { confirmationUrl?: unknown };

    if (!response.ok || typeof payload.confirmationUrl !== "string") {
      throw new Error("Failed to create YooKassa payment link");
    }

    return payload.confirmationUrl;
  } catch {
    await ctx.reply("Не удалось создать ссылку на оплату. Попробуйте ещё раз чуть позже.").catch(() => {});
    return null;
  }
}

export function replaceUrlButtonsWithTariffPurchaseCallbacks(
  keyboard: InlineKeyboardMarkup,
): InlineKeyboardMarkup {
  return {
    inline_keyboard: keyboard.inline_keyboard.map((row) =>
      row.map((button) => {
        if (!("url" in button)) {
          return button;
        }

        return {
          callback_data: buildTariffPurchaseCallbackData(
            inferTariffSlugFromButtonText(button.text),
          ),
          text: button.text,
        };
      }),
    ),
  };
}

export function buildPhotoStyleKeyboard(
  styles: Array<{ id: string; name: string }>,
  itemsPerRow = 2,
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [];

  for (let index = 0; index < styles.length; index += itemsPerRow) {
    rows.push(
      styles.slice(index, index + itemsPerRow).map((style) => ({
        callback_data: `photoshoot-style:${style.id}`,
        text: style.name,
      })),
    );
  }

  return rows;
}

async function showStyleKeyboardIfNeeded(
  ctx: PastryBotContext,
  feature: string,
  slug: string,
) {
  if (feature !== "photoshoot-pick-style" && slug !== "pick-style") return;

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

function getInternalApiBaseUrl(): string {
  return process.env.INTERNAL_API_BASE_URL ?? getPublicAppBaseUrl();
}

function getPublicAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export async function isTariffExpired(ctx: PastryBotContext): Promise<boolean> {
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

export async function sendExpiredTariffMessage(
  ctx: PastryBotContext,
  telegramId: string,
): Promise<void> {
  const step = await loadExpiredTariffStep();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const paymentUrl = buildPaymentUrl(baseUrl, telegramId);
  const buyButtonUrl = resolveBuyButtonUrl(step, paymentUrl, { baseUrl, telegramId });

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { promoClaimed: true },
  });
  const promoClaimed = user?.promoClaimed ?? true;

  if (isPublicAppBaseUrl(baseUrl)) {
    await ctx.replyWithPhoto(resolveTelegramPhotoInput(step.imagePath), {
      caption: step.text,
      reply_markup: buildExpiredTariffKeyboard(buyButtonUrl, step, promoClaimed),
    });
  } else {
    await ctx.reply(step.text, {
      reply_markup: buildExpiredTariffKeyboard(buyButtonUrl, step, promoClaimed),
    });
  }
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

function inferTariffSlugFromButtonText(text: string): TariffPurchaseSlug {
  const normalizedText = text.trim().toLowerCase();

  if (normalizedText.includes("шеф") || normalizedText.includes("head")) {
    return "chief";
  }

  if (normalizedText.includes("мастер") || normalizedText.includes("master")) {
    return "master";
  }

  return "basic";
}
