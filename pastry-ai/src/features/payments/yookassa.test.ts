import { describe, expect, it } from "vitest";
import {
  buildYooKassaCreatePaymentBody,
  buildYooKassaIdempotenceKey,
  getYooKassaTariffProduct,
} from "./yookassa";

describe("getYooKassaTariffProduct", () => {
  it("maps legacy pastry-chef to the live Konditer price and canonical slug", () => {
    expect(
      getYooKassaTariffProduct({
        slug: "pastry-chef",
        tokenAmount: 120,
        durationDays: 30,
      }),
    ).toMatchObject({
      slug: "basic",
      amount: 990,
      currency: "RUB",
      name: "Кондитер",
      tokenAmount: 120,
      durationDays: 30,
    });
  });

  it("uses the configured amount for legacy head-chef and returns the canonical slug", () => {
    const previousAmount = process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB;

    try {
      process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB = "2490";

      expect(
        getYooKassaTariffProduct({
          slug: "head-chef",
          tokenAmount: 500,
          durationDays: 90,
        }),
      ).toMatchObject({
        slug: "chief",
        amount: 2490,
        currency: "RUB",
        name: "Шеф-кондитер",
        tokenAmount: 500,
        durationDays: 90,
      });
    } finally {
      process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB = previousAmount;
    }
  });

  it("rejects head-chef when the configured amount is missing", () => {
    const previousAmount = process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB;

    try {
      delete process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB;

      expect(() =>
        getYooKassaTariffProduct({
          slug: "head-chef",
          tokenAmount: 500,
          durationDays: 90,
        }),
      ).toThrow("YOOKASSA_HEAD_CHEF_AMOUNT_RUB is required");
    } finally {
      process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB = previousAmount;
    }
  });

  it("rejects head-chef when the configured amount is not a positive payment amount", () => {
    const previousAmount = process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB;

    try {
      process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB = "0";

      expect(() =>
        getYooKassaTariffProduct({
          slug: "head-chef",
          tokenAmount: 500,
          durationDays: 90,
        }),
      ).toThrow(
        "Invalid environment: YOOKASSA_HEAD_CHEF_AMOUNT_RUB must be a positive payment amount",
      );
    } finally {
      process.env.YOOKASSA_HEAD_CHEF_AMOUNT_RUB = previousAmount;
    }
  });

  it("rejects unsupported tariff slugs", () => {
    expect(() =>
      getYooKassaTariffProduct({
        slug: "starter",
        tokenAmount: 10,
        durationDays: 7,
      }),
    ).toThrow("Unsupported tariff slug: starter");
  });
});

describe("buildYooKassaIdempotenceKey", () => {
  it("includes the user, tariff, and timestamp", () => {
    expect(
      buildYooKassaIdempotenceKey({
        userId: "user-1",
        tariffSlug: "master",
        now: new Date("2026-07-21T10:00:00.000Z"),
      }),
    ).toBe("yookassa:user-1:master:1784628000000");
  });
});

describe("buildYooKassaCreatePaymentBody", () => {
  it("builds a redirect payment body with save_payment_method enabled", () => {
    expect(
      buildYooKassaCreatePaymentBody({
        userId: "user-1",
        tariffPlanId: "tariff-1",
        tariffSlug: "master",
        tariffName: "Мастер",
        tokenAmount: 220,
        durationDays: 30,
        returnUrl: "https://example.com/payments/return",
      }),
    ).toMatchObject({
      capture: true,
      save_payment_method: true,
      confirmation: {
        type: "redirect",
        return_url: "https://example.com/payments/return",
      },
      metadata: {
        userId: "user-1",
        tariffPlanId: "tariff-1",
        tariffSlug: "master",
      },
    });
  });

  it("formats the amount and description from the mapped tariff product", () => {
    expect(
      buildYooKassaCreatePaymentBody({
        userId: "user-1",
        tariffPlanId: "tariff-1",
        tariffSlug: "master",
        tariffName: "Мастер",
        tokenAmount: 220,
        durationDays: 30,
        returnUrl: "https://example.com/payments/return",
      }),
    ).toMatchObject({
      amount: {
        value: "1490.00",
        currency: "RUB",
      },
      description: "Мастер - 30 дней",
    });
  });
});
