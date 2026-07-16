import type { InlineKeyboardButton, InlineKeyboardMarkup } from "grammy/types";

export type BuyButton = {
  text: string;
  url: string;
  active: boolean;
  sortOrder: number;
};

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

export function migrateLegacyStep(step: OnboardingStep): OnboardingStep {
  if (step.buyButtons.length > 0) {
    return step;
  }

  const legacyText = step.buyButtonText?.trim();
  if (!legacyText) {
    return { ...step, buyButtons: [] };
  }

  return {
    ...step,
    buyButtons: [
      {
        text: legacyText,
        url: step.buyButtonUrl?.trim() ?? "",
        active: true,
        sortOrder: 0,
      },
    ],
  };
}

export const onboardingSteps: OnboardingStep[] = [
  {
    title: "welcome",
    imagePath: "/onboarding/welcome.png",
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
  return (
    steps[Math.min(Math.max(index, 0), steps.length - 1)] ?? onboardingSteps[0]
  );
}

export function buildOnboardingKeyboard(
  index: number,
  paymentUrl: string,
  steps = onboardingSteps,
): InlineKeyboardMarkup {
  const step = getOnboardingStep(index, steps);
  const migrated = migrateLegacyStep(step);
  const rows: InlineKeyboardButton[][] = [];

  const activeBuyButtons = migrated.buyButtons
    .filter((b) => b.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeBuyButtons.length > 0) {
    const isLastOnLast = index >= steps.length - 1 && !migrated.nextButtonText?.trim();

    if (isLastOnLast) {
      const fallback =
        migrated.offerButtonText?.trim() || activeBuyButtons[0].text;
      rows.push([
        { text: fallback, url: activeBuyButtons[0].url || paymentUrl },
      ]);
      return { inline_keyboard: rows };
    }

    const nextRow: InlineKeyboardButton[] = [];

    if (migrated.nextButtonText?.trim()) {
      nextRow.push({
        callback_data: `onboarding:${index + 1}`,
        text: migrated.nextButtonText.trim(),
      });
    }

    for (const btn of activeBuyButtons) {
      const url = btn.url || paymentUrl;
      nextRow.push({ text: btn.text, url });
    }

    rows.push(nextRow);
  } else {
    const offerText = migrated.offerButtonText?.trim();
    if (offerText && index >= steps.length - 1) {
      rows.push([{ text: offerText, url: paymentUrl }]);
    } else if (migrated.nextButtonText?.trim()) {
      rows.push([
        {
          callback_data: `onboarding:${index + 1}`,
          text: migrated.nextButtonText.trim(),
        },
      ]);
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

    return (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "::1"
    );
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

export async function loadOnboardingSteps(): Promise<OnboardingStep[]> {
  try {
    const { prisma } = await import("@/db/prisma");
    const rows = await prisma.funnelStep.findMany({
      where: { active: true },
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
        buyButtons: Array.isArray(row.buyButtons) ? (row.buyButtons as BuyButton[]) : [],
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
      buyButtons: Array.isArray(step.buyButtons) ? (step.buyButtons as BuyButton[]) : [],
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

  const activeButtons = migrated.buyButtons
    .filter((b) => b.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (activeButtons.length > 0) {
    for (const btn of activeButtons) {
      rows.push([{ text: btn.text, url: btn.url || paymentUrl }]);
    }
  } else {
    rows.push([{ text: migrated.buyButtonText || "Оплатить", url: paymentUrl }]);
  }

  return { inline_keyboard: rows };
}