import { requireYooKassaHeadChefAmountRub } from "@/lib/env";
import { normalizeTariffPurchaseSlug } from "./tariff-purchase";

const PRICE_BY_SLUG = {
  basic: 990,
  master: 1490,
} as const;

export type YooKassaTariffProduct = {
  slug: string;
  amount: number;
  currency: "RUB";
  name: string;
  durationDays: number;
  tokenAmount: number;
};

export function getYooKassaTariffProduct(input: {
  slug: string;
  tokenAmount: number;
  durationDays: number;
}): YooKassaTariffProduct {
  const normalizedSlug = normalizeTariffPurchaseSlug(input.slug);

  if (normalizedSlug === "chief") {
    const amount = requireYooKassaHeadChefAmountRub();

    return {
      slug: normalizedSlug,
      amount,
      currency: "RUB",
      name: "Шеф-кондитер",
      tokenAmount: input.tokenAmount,
      durationDays: input.durationDays,
    };
  }

  if (normalizedSlug === "basic") {
    return {
      slug: normalizedSlug,
      amount: PRICE_BY_SLUG.basic,
      currency: "RUB",
      name: "Кондитер",
      tokenAmount: input.tokenAmount,
      durationDays: input.durationDays,
    };
  }

  if (normalizedSlug === "master") {
    return {
      slug: normalizedSlug,
      amount: PRICE_BY_SLUG.master,
      currency: "RUB",
      name: "Мастер",
      tokenAmount: input.tokenAmount,
      durationDays: input.durationDays,
    };
  }

  throw new Error(`Unsupported tariff slug: ${input.slug}`);
}

export function buildYooKassaIdempotenceKey(input: {
  userId: string;
  tariffSlug: string;
  now?: Date;
}) {
  return `yookassa:${input.userId}:${input.tariffSlug}:${(input.now ?? new Date()).getTime()}`;
}

export function buildYooKassaCreatePaymentBody(input: {
  userId: string;
  tariffPlanId: string;
  tariffSlug: string;
  tariffName: string;
  tokenAmount: number;
  durationDays: number;
  returnUrl: string;
}): Record<string, unknown> {
  const product = getYooKassaTariffProduct({
    slug: input.tariffSlug,
    tokenAmount: input.tokenAmount,
    durationDays: input.durationDays,
  });

  return {
    amount: {
      value: product.amount.toFixed(2),
      currency: product.currency,
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: input.returnUrl,
    },
    description: `${product.name} - ${product.durationDays} дней`,
    metadata: {
      userId: input.userId,
      tariffPlanId: input.tariffPlanId,
      tariffSlug: input.tariffSlug,
    },
    save_payment_method: true,
  };
}
