import { describe, expect, it } from "vitest";
import {
  buildOnboardingKeyboard,
  getOnboardingStep,
  isPublicAppBaseUrl,
  onboardingSteps,
  resolveBuyButtonUrl,
} from "./onboarding";

describe("onboarding", () => {
  it("starts with the welcome step and advances through stories", () => {
    expect(onboardingSteps).toHaveLength(5);
    expect(getOnboardingStep(0).title).toBe("welcome");
    expect(getOnboardingStep(4).title).toBe("offer");
  });

  it("shows next and buy buttons before the offer", () => {
    const keyboard = buildOnboardingKeyboard(1, "https://example.com/pay");

    expect(keyboard.inline_keyboard.flat().map((button) => button.text)).toEqual(
      ["Далее", "Купить"],
    );
  });

  it("shows only the buy button on the offer", () => {
    const keyboard = buildOnboardingKeyboard(4, "https://example.com/pay");

    expect(keyboard.inline_keyboard.flat().map((button) => button.text)).toEqual(
      ["1 модель и 70 фото | 899₽"],
    );
  });

  it("uses custom button labels from database steps", () => {
    const steps = onboardingSteps.map((step) => ({
      ...step,
      buyButtonText: "Оплатить",
      nextButtonText: "Продолжить",
      offerButtonText: step.title === "offer" ? "Спецпредложение" : null,
    }));

    expect(
      buildOnboardingKeyboard(1, "https://example.com/pay", steps)
        .inline_keyboard.flat()
        .map((button) => button.text),
    ).toEqual(["Продолжить", "Оплатить"]);
    expect(
      buildOnboardingKeyboard(4, "https://example.com/pay", steps)
        .inline_keyboard.flat()
        .map((button) => button.text),
    ).toEqual(["Спецпредложение"]);
  });

  it("uses a custom buy button URL with telegram and base URL placeholders", () => {
    const buyUrl = resolveBuyButtonUrl(
      {
        ...onboardingSteps[0],
        buyButtonUrl: "{{baseUrl}}/special-offer?tid={{telegramId}}",
      },
      "https://example.com/pay?telegramId=123",
      {
        baseUrl: "https://bot.example.com/",
        telegramId: "123",
      },
    );

    expect(buyUrl).toBe("https://bot.example.com/special-offer?tid=123");
  });

  it("falls back to the generated payment URL when a step has no custom URL", () => {
    expect(
      resolveBuyButtonUrl(onboardingSteps[0], "https://example.com/pay", {
        baseUrl: "https://bot.example.com",
        telegramId: "123",
      }),
    ).toBe("https://example.com/pay");
  });

  it("detects when APP_BASE_URL is only local and not reachable for Telegram", () => {
    expect(isPublicAppBaseUrl("http://localhost:3000")).toBe(false);
    expect(isPublicAppBaseUrl("http://127.0.0.1:3000")).toBe(false);
    expect(isPublicAppBaseUrl("https://example.ngrok-free.app")).toBe(true);
  });
});
