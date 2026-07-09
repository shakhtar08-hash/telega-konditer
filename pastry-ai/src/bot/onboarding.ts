import type { InlineKeyboardMarkup } from "grammy/types";

export type OnboardingStep = {
  imagePath: string;
  nextButtonText: string;
  buyButtonText: string;
  buyButtonUrl?: string | null;
  offerButtonText?: string | null;
  text: string;
  title: string;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: "welcome",
    imagePath: "/onboarding/welcome.png",
    text: "Привет! Я помогу создать ИИ-фотосессию в любом образе.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "maria",
    imagePath: "/onboarding/maria.png",
    text: "История 1: Мария получила реалистичные студийные образы.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "polina",
    imagePath: "/onboarding/polina.png",
    text: "История 2: Полина обновила контент для соцсетей.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "ksusha",
    imagePath: "/onboarding/ksusha.png",
    text: "История 3: Ксюша попробовала новые стили и получила мотивирующие фото.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
    buyButtonUrl: null,
    offerButtonText: null,
  },
  {
    title: "offer",
    imagePath: "/onboarding/offer.png",
    text: "Супер-предложение: 899₽ вместо 1800₽ в месяц.",
    nextButtonText: "Далее",
    buyButtonText: "Купить",
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
  const isOffer = index >= steps.length - 1;
  const step = getOnboardingStep(index, steps);

  return {
    inline_keyboard: [
      isOffer
        ? [{ text: step.offerButtonText ?? step.buyButtonText, url: paymentUrl }]
        : [
            { callback_data: `onboarding:${index + 1}`, text: step.nextButtonText },
            { text: step.buyButtonText, url: paymentUrl },
          ],
    ],
  };
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
    const steps = await prisma.funnelStep.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        buyButtonText: true,
        buyButtonUrl: true,
        imagePath: true,
        nextButtonText: true,
        offerButtonText: true,
        text: true,
        title: true,
      },
    });

    return steps.length > 0 ? steps : onboardingSteps;
  } catch {
    return onboardingSteps;
  }
}

const expiredTariffFallback: OnboardingStep = {
  title: "expired-tariff",
  imagePath: "/onboarding/offer.png",
  text: "Срок действия вашего тарифа истёк. Чтобы продолжить пользоваться ботом, оплатите новую подписку.",
  nextButtonText: "",
  buyButtonText: "Оплатить",
  buyButtonUrl: null,
  offerButtonText: null,
};

export async function loadExpiredTariffStep(): Promise<OnboardingStep> {
  try {
    const { prisma } = await import("@/db/prisma");
    const step = await prisma.funnelStep.findFirst({
      where: { slug: "expired-tariff", active: true },
      select: {
        buyButtonText: true,
        buyButtonUrl: true,
        imagePath: true,
        nextButtonText: true,
        offerButtonText: true,
        text: true,
        title: true,
      },
    });

    return step ?? expiredTariffFallback;
  } catch {
    return expiredTariffFallback;
  }
}

export function buildExpiredTariffKeyboard(
  paymentUrl: string,
  step: OnboardingStep,
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ callback_data: "try_free", text: "Попробовать бесплатно" }],
      [{ text: step.buyButtonText, url: paymentUrl }],
    ],
  };
}
