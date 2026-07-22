import type { InlineKeyboardButton, InlineKeyboardMarkup } from "grammy/types";
import {
  buildTariffPurchaseCallbackData,
  normalizeTariffPurchaseSlug,
} from "@/features/payments/tariff-purchase";
import {
  buildFunnelButtonsForEditor,
  parseStoredFunnelBuyButtons,
  type FunnelBuyButton,
} from "@/features/funnel/funnel-buttons";

type LegacyBuyButton = {
  text: string;
  url: string;
  active: boolean;
  sortOrder: number;
};

export type BuyButton = FunnelBuyButton | LegacyBuyButton;

export type OnboardingStep = {
  imagePath: string;
  nextButtonText: string;
  nextAction: "next" | "activate_promo_and_next";
  buyButtons: BuyButton[];
  buyButtonText: string;
  buyButtonUrl?: string | null;
  offerButtonText?: string | null;
  text: string;
  title: string;
};

function normalizeBuyButtons(buttons: BuyButton[]): FunnelBuyButton[] {
  return parseStoredFunnelBuyButtons(buttons);
}

export function migrateLegacyStep(step: OnboardingStep): OnboardingStep {
  const normalizedBuyButtons =
    step.buyButtons.length > 0
      ? normalizeBuyButtons(step.buyButtons)
      : step.buyButtonText.trim()
        ? buildFunnelButtonsForEditor({
            buyButtons: step.buyButtons,
            buyButtonText: step.buyButtonText,
            buyButtonUrl: step.buyButtonUrl,
          })
        : [];

  return {
    ...step,
    buyButtons: normalizedBuyButtons,
  };
}

export const onboardingSteps: OnboardingStep[] = [
  {
    title: "welcome",
    imagePath: "/onboarding/1.jpg",
    text: "Привет! Я помогу создать ИИ-фотосессию в любом образе.",
    nextButtonText: "Далее",
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "maria",
    imagePath: "/onboarding/maria.png",
    text: "История 1: Мария получила реалистичные студийные образы.",
    nextButtonText: "Далее",
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "polina",
    imagePath: "/onboarding/polina.png",
    text: "История 2: Полина обновила контент для соцсетей.",
    nextButtonText: "Далее",
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "ksusha",
    imagePath: "/onboarding/ksusha.png",
    text: "История 3: Ксюша попробовала новые стили и получила мотивирующие фото.",
    nextButtonText: "Далее",
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "offer",
    imagePath: "/onboarding/offer.png",
    text: "Супер-предложение: 899₽ вместо 1800₽ в месяц.",
    nextButtonText: "Далее",
    nextAction: "activate_promo_and_next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: "1 модель и 70 фото | 899₽",
  },
];

export function getOnboardingStep(index: number, steps = onboardingSteps) {
  return steps[Math.min(Math.max(index, 0), steps.length - 1)] ?? onboardingSteps[0];
}

export function buildOnboardingKeyboard(
  index: number,
  paymentUrl: string,
  steps = onboardingSteps,
): InlineKeyboardMarkup {
  const step = getOnboardingStep(index, steps);
  const migrated = migrateLegacyStep(step);
  const rows: InlineKeyboardButton[][] = [];

  const activeBuyButtons = normalizeBuyButtons(migrated.buyButtons)
    .filter((button) => button.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeBuyButtons.length > 0) {
    const navigationButtons = activeBuyButtons.filter(
      (button) =>
        button.actionType === "NEXT" || button.actionType === "ACTIVATE_PROMO_AND_NEXT",
    );
    const actionButtons = activeBuyButtons.filter(
      (button) =>
        button.actionType !== "NEXT" &&
        button.actionType !== "ACTIVATE_PROMO_AND_NEXT",
    );
    const isLastOnLast =
      index >= steps.length - 1 &&
      navigationButtons.length === 0 &&
      !migrated.nextButtonText?.trim();

    if (isLastOnLast) {
      const fallbackText = migrated.offerButtonText?.trim() || activeBuyButtons[0].text;
      rows.push([
        buildRuntimeBuyButton(
          actionButtons[0] ?? activeBuyButtons[0],
          paymentUrl,
          index,
          fallbackText,
        ),
      ]);
      return { inline_keyboard: rows };
    }

    const nextRow: InlineKeyboardButton[] = [];

    if (navigationButtons[0]) {
      nextRow.push(buildRuntimeBuyButton(navigationButtons[0], paymentUrl, index));
    } else if (migrated.nextButtonText?.trim()) {
      nextRow.push(buildRuntimeNavigationButton(migrated.nextButtonText.trim(), index));
    }

    for (const button of actionButtons) {
      nextRow.push(buildRuntimeBuyButton(button, paymentUrl, index));
    }

    rows.push(nextRow);
  } else {
    const offerText = migrated.offerButtonText?.trim();
    if (offerText && index >= steps.length - 1) {
      rows.push([{ text: offerText, url: paymentUrl }]);
    } else if (migrated.nextButtonText?.trim()) {
      rows.push([buildRuntimeNavigationButton(migrated.nextButtonText.trim(), index)]);
    }
  }

  return { inline_keyboard: rows };
}

export function buildPaymentUrl(baseUrl: string, telegramId: string) {
  const url = new URL("/pay", baseUrl);
  url.searchParams.set("telegramId", telegramId);

  return url.toString();
}

export function isPublicAppBaseUrl(baseUrl: string) {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();

    return hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1";
  } catch {
    return false;
  }
}

export function resolveBuyButtonUrl(
  step: Pick<OnboardingStep, "buyButtonUrl">,
  fallbackUrl: string,
  context: { baseUrl: string; telegramId: string },
) {
  const rawUrl = step.buyButtonUrl?.trim();

  if (!rawUrl) {
    return fallbackUrl;
  }

  const baseUrl = context.baseUrl.replace(/\/$/, "");

  return rawUrl
    .replaceAll("{{baseUrl}}", baseUrl)
    .replaceAll("{{telegramId}}", context.telegramId);
}

function resolveRuntimeBuyButtonUrl(rawUrl: string, fallbackUrl: string) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return fallbackUrl;
  }

  try {
    const parsedFallback = new URL(fallbackUrl);
    const baseUrl = parsedFallback.origin;
    const telegramId = parsedFallback.searchParams.get("telegramId") ?? "";
    const templatedUrl = trimmedUrl
      .replaceAll("{{baseUrl}}", baseUrl)
      .replaceAll("{{telegramId}}", telegramId);

    return new URL(templatedUrl, `${baseUrl}/`).toString();
  } catch {
    return trimmedUrl;
  }
}

export async function loadOnboardingSteps(): Promise<OnboardingStep[]> {
  try {
    const { prisma } = await import("@/db/prisma");
    const rows = await prisma.funnelStep.findMany({
      where: {
        active: true,
        slug: { not: "expired-tariff" },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        buyButtons: true,
        buyButtonText: true,
        buyButtonUrl: true,
        imagePath: true,
        nextButtonText: true,
        nextAction: true,
        offerButtonText: true,
        text: true,
        title: true,
      },
    });

    if (rows.length === 0) return onboardingSteps;

    return rows.map((row) =>
      migrateLegacyStep({
        imagePath: row.imagePath,
        nextButtonText: row.nextButtonText,
        nextAction: (row.nextAction ?? "next") as "next" | "activate_promo_and_next",
        buyButtons: parseStoredFunnelBuyButtons(row.buyButtons),
        buyButtonText: row.buyButtonText ?? "",
        buyButtonUrl: row.buyButtonUrl,
        offerButtonText: row.offerButtonText,
        text: row.text,
        title: row.title,
      }),
    );
  } catch {
    return onboardingSteps;
  }
}

const expiredTariffFallback: OnboardingStep = {
  title: "expired-tariff",
  imagePath: "/onboarding/offer.png",
  text: "Срок действия вашего тарифа истёк. Чтобы продолжить пользоваться ботом, оплатите новую подписку.",
  nextButtonText: "",
  nextAction: "next",
  buyButtons: [],
  buyButtonText: "",
  buyButtonUrl: null,
  offerButtonText: null,
};

export async function loadExpiredTariffStep(): Promise<OnboardingStep> {
  try {
    const { prisma } = await import("@/db/prisma");
    const step = await prisma.funnelStep.findFirst({
      where: { slug: "expired-tariff", active: true },
      select: {
        buyButtons: true,
        buyButtonText: true,
        buyButtonUrl: true,
        imagePath: true,
        nextButtonText: true,
        nextAction: true,
        offerButtonText: true,
        text: true,
        title: true,
      },
    });

    if (!step) return expiredTariffFallback;

    return migrateLegacyStep({
      imagePath: step.imagePath,
      nextButtonText: step.nextButtonText,
      nextAction: (step.nextAction ?? "next") as "next" | "activate_promo_and_next",
      buyButtons: parseStoredFunnelBuyButtons(step.buyButtons),
      buyButtonText: step.buyButtonText ?? "",
      buyButtonUrl: step.buyButtonUrl,
      offerButtonText: step.offerButtonText,
      text: step.text,
      title: step.title,
    });
  } catch {
    return expiredTariffFallback;
  }
}

export function buildExpiredTariffKeyboard(
  paymentUrl: string,
  step: OnboardingStep,
): InlineKeyboardMarkup {
  const migrated = migrateLegacyStep(step);
  const rows: InlineKeyboardButton[][] = [];

  rows.push([{ callback_data: "try_free", text: "Попробовать бесплатно" }]);

  const activeButtons = normalizeBuyButtons(migrated.buyButtons)
    .filter((button) => button.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeButtons.length > 0) {
    for (const button of activeButtons) {
      rows.push([buildRuntimeBuyButton(button, paymentUrl, 0)]);
    }
  } else {
    rows.push([{ text: migrated.buyButtonText || "Оплатить", url: paymentUrl }]);
  }

  return { inline_keyboard: rows };
}

function buildRuntimeNavigationButton(
  text: string,
  index: number,
): InlineKeyboardButton {
  return {
    callback_data: `onboarding:${index + 1}`,
    text,
  };
}

function buildRuntimeBuyButton(
  button: BuyButton,
  paymentUrl: string,
  index: number,
  textOverride?: string,
): InlineKeyboardButton {
  const normalizedButton = parseStoredFunnelBuyButtons([button])[0];
  const text = textOverride ?? normalizedButton?.text ?? button.text;

  if (!normalizedButton) {
    return {
      text,
      url: paymentUrl,
    };
  }

  switch (normalizedButton.actionType) {
    case "NEXT":
    case "ACTIVATE_PROMO_AND_NEXT":
      return buildRuntimeNavigationButton(text, index);
    case "TARIFF_PURCHASE":
      const tariffSlug = normalizedButton.actionValue;
      return {
        callback_data: buildTariffPurchaseCallbackData(
          normalizeTariffPurchaseSlug(tariffSlug) ?? "basic",
        ),
        text,
      };
    case "BOT_COMMAND":
      return {
        callback_data: `funnel:command:${normalizedButton.actionValue ?? "/menu"}`,
        text,
      };
    case "URL":
    default:
      return {
        text,
        url: resolveRuntimeBuyButtonUrl(normalizedButton.actionValue ?? "", paymentUrl),
      };
  }
}
