import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildExpiredTariffKeyboard,
  buildOnboardingKeyboard,
  getOnboardingStep,
  migrateLegacyStep,
  onboardingSteps,
  resolveBuyButtonUrl,
  type OnboardingStep,
} from "./onboarding";

const defaultSteps: OnboardingStep[] = [
  {
    imagePath: "/onboarding/1.jpg",
    nextButtonText: "Далее",
    nextAction: "next",
    buyButtons: [],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: null,
    text: "Привет!",
    title: "welcome",
  },
  {
    imagePath: "/onboarding/maria.png",
    nextButtonText: "Далее",
    nextAction: "next",
    buyButtons: [
      { text: "Купить", url: "", active: true, sortOrder: 0 },
    ],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: null,
    text: "История Марии.",
    title: "maria",
  },
  {
    imagePath: "/onboarding/offer.png",
    nextButtonText: "Далее",
    nextAction: "activate_promo_and_next",
    buyButtons: [
      { text: "Купить", url: "", active: true, sortOrder: 0 },
      { text: "Премиум", url: "{{baseUrl}}/premium?tid={{telegramId}}", active: true, sortOrder: 1 },
    ],
    buyButtonText: "",
    buyButtonUrl: null,
    offerButtonText: "1 месяц | 899 ₽",
    text: "Оффер!",
    title: "offer",
  },
];

describe("migrateLegacyStep", () => {
  it("uses buyButtons when present", () => {
    const step: OnboardingStep = {
      imagePath: "/img.png",
      nextButtonText: "Далее",
      nextAction: "next",
      buyButtons: [{ text: "Оплатить", url: "https://pay.me", active: true, sortOrder: 0 }],
      buyButtonText: "Купить",
      buyButtonUrl: "https://legacy.url",
      offerButtonText: null,
      text: "text",
      title: "test",
    };
    const result = migrateLegacyStep(step);
    expect(result.buyButtons).toHaveLength(1);
    expect(result.buyButtons[0].text).toBe("Оплатить");
  });

  it("migrates from legacy buyButtonText when buyButtons is empty", () => {
    const step: OnboardingStep = {
      imagePath: "/img.png",
      nextButtonText: "Далее",
      nextAction: "next",
      buyButtons: [],
      buyButtonText: "Купить",
      buyButtonUrl: "https://pay.me",
      offerButtonText: null,
      text: "text",
      title: "test",
    };
    const result = migrateLegacyStep(step);
    expect(result.buyButtons).toHaveLength(1);
    expect(result.buyButtons[0].text).toBe("Купить");
    expect(result.buyButtons[0]).toMatchObject({
      actionType: "URL",
      actionValue: "https://pay.me",
      active: true,
      sortOrder: 0,
    });
  });

  it("returns empty buyButtons when both legacy and new are empty", () => {
    const step: OnboardingStep = {
      imagePath: "/img.png",
      nextButtonText: "Далее",
      nextAction: "next",
      buyButtons: [],
      buyButtonText: "",
      buyButtonUrl: null,
      offerButtonText: null,
      text: "text",
      title: "test",
    };
    const result = migrateLegacyStep(step);
    expect(result.buyButtons).toHaveLength(0);
  });
});

describe("getOnboardingStep", () => {
  it("returns the correct step by index", () => {
    expect(getOnboardingStep(0, defaultSteps).title).toBe("welcome");
    expect(getOnboardingStep(2, defaultSteps).title).toBe("offer");
  });

  it("clamps out-of-range index", () => {
    expect(getOnboardingStep(-1, defaultSteps).title).toBe("welcome");
    expect(getOnboardingStep(100, defaultSteps).title).toBe("offer");
  });
});

describe("default onboarding assets", () => {
  it("uses the jpg welcome slide for the first step", () => {
    expect(onboardingSteps[0]?.imagePath).toBe("/onboarding/1.jpg");
  });

  it("points every default step to an existing public asset", () => {
    for (const step of onboardingSteps) {
      const assetPath = resolve(process.cwd(), "public", step.imagePath.replace(/^\//, ""));
      expect(existsSync(assetPath), step.imagePath).toBe(true);
    }
  });
});

describe("buildOnboardingKeyboard with multiple buy buttons", () => {
  it("renders next + multiple buy buttons on non-offer step", () => {
    const keyboard = buildOnboardingKeyboard(0, "https://example.com/pay", defaultSteps);
    const allText = keyboard.inline_keyboard.flat().map((button) => button.text);
    expect(allText).toContain("Далее");
    expect(allText).not.toContain("Купить");
  });

  it("renders next + buy button on step with single buy button", () => {
    const keyboard = buildOnboardingKeyboard(1, "https://example.com/pay", defaultSteps);
    const allText = keyboard.inline_keyboard.flat().map((button) => button.text);
    expect(allText).toEqual(["Далее", "Купить"]);
  });

  it("renders next + multiple buy buttons on step with multiple active buy buttons", () => {
    const steps: OnboardingStep[] = [
      {
        imagePath: "/img.png",
        nextButtonText: "Далее",
        nextAction: "next",
        buyButtons: [
          { text: "Стандарт", url: "https://pay1", active: true, sortOrder: 0 },
          { text: "Премиум", url: "https://pay2", active: true, sortOrder: 1 },
        ],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: null,
        text: "Выберите тариф",
        title: "multi-pay",
      },
    ];
    const keyboard = buildOnboardingKeyboard(0, "https://fallback", steps);
    const texts = keyboard.inline_keyboard.flat().map((button) => button.text);
    expect(texts).toContain("Далее");
    expect(texts).toContain("Стандарт");
    expect(texts).toContain("Премиум");
  });

  it("filters out inactive buy buttons", () => {
    const steps: OnboardingStep[] = [
      {
        imagePath: "/img.png",
        nextButtonText: "Далее",
        nextAction: "next",
        buyButtons: [
          { text: "Активный", url: "https://pay1", active: true, sortOrder: 0 },
          { text: "Неактивный", url: "https://pay2", active: false, sortOrder: 1 },
        ],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: null,
        text: "test",
        title: "test",
      },
    ];
    const keyboard = buildOnboardingKeyboard(0, "https://fallback", steps);
    const texts = keyboard.inline_keyboard.flat().map((button) => button.text);
    expect(texts).toContain("Активный");
    expect(texts).not.toContain("Неактивный");
  });

  it("orders buy buttons by sortOrder", () => {
    const steps: OnboardingStep[] = [
      {
        imagePath: "/img.png",
        nextButtonText: "Далее",
        nextAction: "next",
        buyButtons: [
          { text: "Второй", url: "https://pay2", active: true, sortOrder: 1 },
          { text: "Первый", url: "https://pay1", active: true, sortOrder: 0 },
        ],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: null,
        text: "test",
        title: "test",
      },
    ];
    const keyboard = buildOnboardingKeyboard(0, "https://fallback", steps);
    const buyTexts = keyboard.inline_keyboard
      .flat()
      .filter((button) => button.text !== "Далее")
      .map((button) => button.text);
    expect(buyTexts).toEqual(["Первый", "Второй"]);
  });

  it("renders only buy buttons when no nextButtonText", () => {
    const steps: OnboardingStep[] = [
      {
        imagePath: "/img.png",
        nextButtonText: "",
        nextAction: "next",
        buyButtons: [{ text: "Оплатить", url: "https://pay", active: true, sortOrder: 0 }],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: null,
        text: "last step",
        title: "last",
      },
    ];
    const keyboard = buildOnboardingKeyboard(0, "https://fallback", steps);
    const texts = keyboard.inline_keyboard.flat().map((button) => button.text);
    expect(texts).toEqual(["Оплатить"]);
  });

  it("renders tariff purchase onboarding buttons as callback buttons", () => {
    const steps: OnboardingStep[] = [
      {
        imagePath: "/img.png",
        nextButtonText: "",
        nextAction: "next",
        buyButtons: [
          {
            text: "Кондитер",
            actionType: "TARIFF_PURCHASE",
            actionValue: "pastry-chef",
            active: true,
            sortOrder: 0,
          } as OnboardingStep["buyButtons"][number],
        ],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: null,
        text: "offer",
        title: "offer",
      },
    ];
    const keyboard = buildOnboardingKeyboard(0, "https://fallback", steps);

    expect(keyboard.inline_keyboard[0]?.[0]).toEqual({
      callback_data: "tariff:buy:basic",
      text: "Кондитер",
    });
  });

  it("uses offerButtonText when last step and empty buyButtons", () => {
    const steps: OnboardingStep[] = [
      {
        imagePath: "/img.png",
        nextButtonText: "",
        nextAction: "next",
        buyButtons: [],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: "Спецпредложение 899₽",
        text: "offer",
        title: "offer",
      },
    ];
    const keyboard = buildOnboardingKeyboard(0, "https://pay.url", steps);
    const texts = keyboard.inline_keyboard.flat().map((button) => button.text);
    expect(texts).toEqual(["Спецпредложение 899₽"]);
  });
});

describe("resolveBuyButtonUrl", () => {
  it("falls back when buy button has empty url", () => {
    const step: OnboardingStep = {
      imagePath: "/img.png",
      nextButtonText: "Далее",
      nextAction: "next",
      buyButtons: [],
      buyButtonText: "",
      buyButtonUrl: "",
      offerButtonText: null,
      text: "text",
      title: "test",
    };
    expect(
      resolveBuyButtonUrl(step, "https://fallback", {
        baseUrl: "https://bot.example.com",
        telegramId: "123",
      }),
    ).toBe("https://fallback");
  });

  it("resolves {{baseUrl}} and {{telegramId}} in custom url", () => {
    const step: OnboardingStep = {
      imagePath: "/img.png",
      nextButtonText: "Далее",
      nextAction: "next",
      buyButtons: [],
      buyButtonText: "",
      buyButtonUrl: "{{baseUrl}}/pay?tid={{telegramId}}",
      offerButtonText: null,
      text: "text",
      title: "test",
    };
    expect(
      resolveBuyButtonUrl(step, "https://fallback", {
        baseUrl: "https://bot.example.com",
        telegramId: "456",
      }),
    ).toBe("https://bot.example.com/pay?tid=456");
  });
});

describe("activate_promo_and_next", () => {
  it("should be set on the offer step in defaultSteps", () => {
    expect(defaultSteps[2].nextAction).toBe("activate_promo_and_next");
  });
});

describe("runtime URL resolution", () => {
  it("resolves placeholders in active onboarding buy button URLs", () => {
    const keyboard = buildOnboardingKeyboard(
      2,
      "https://bot.example.com/pay?telegramId=456",
      defaultSteps,
    );
    const premiumButton = keyboard.inline_keyboard
      .flat()
      .find((button) => button.text === "Премиум");

    expect(premiumButton).toEqual({
      text: "Премиум",
      url: "https://bot.example.com/premium?tid=456",
    });
  });

  it("resolves placeholders in expired tariff buy button URLs", () => {
    const keyboard = buildExpiredTariffKeyboard(
      "https://bot.example.com/pay?telegramId=789",
      {
        imagePath: "/offer.png",
        nextButtonText: "",
        nextAction: "next",
        buyButtons: [
          {
            text: "Оплатить",
            url: "{{baseUrl}}/pay?telegramId={{telegramId}}",
            active: true,
            sortOrder: 0,
          },
        ],
        buyButtonText: "",
        buyButtonUrl: null,
        offerButtonText: null,
        text: "expired",
        title: "expired",
      },
    );

    expect(keyboard.inline_keyboard[1]?.[0]).toEqual({
      text: "Оплатить",
      url: "https://bot.example.com/pay?telegramId=789",
    });
  });
});
