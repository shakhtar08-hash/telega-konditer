import { describe, expect, it } from "vitest";
import { parseBuyButtons, parseBuyButtonsFromFormData } from "./buy-buttons-form";

describe("parseBuyButtons", () => {
  it("normalizes new funnel button action types", () => {
    expect(
      parseBuyButtons([
        {
          text: "990Р",
          actionType: "TARIFF_PURCHASE",
          actionValue: "pastry-chef",
          active: true,
          sortOrder: 0,
        },
        {
          text: "Далее",
          actionType: "NEXT",
          actionValue: null,
          active: true,
          sortOrder: 1,
        },
      ]),
    ).toEqual([
      {
        text: "990Р",
        actionType: "TARIFF_PURCHASE",
        actionValue: "pastry-chef",
        active: true,
        sortOrder: 0,
      },
      {
        text: "Далее",
        actionType: "NEXT",
        actionValue: null,
        active: true,
        sortOrder: 1,
      },
    ]);
  });

  it("migrates legacy text + url buttons into URL action buttons", () => {
    expect(
      parseBuyButtons([
        {
          text: "Оплатить",
          url: "https://example.com/pay",
          active: true,
          sortOrder: 0,
        },
      ]),
    ).toEqual([
      {
        text: "Оплатить",
        actionType: "URL",
        actionValue: "https://example.com/pay",
        active: true,
        sortOrder: 0,
      },
    ]);
  });
});

describe("parseBuyButtonsFromFormData", () => {
  it("parses typed funnel buttons from posted form data", () => {
    const formData = new FormData();
    formData.append("buyButtonText[]", "Кондитер");
    formData.append("buyButtonActionType[]", "TARIFF_PURCHASE");
    formData.append("buyButtonActionValue[]", "pastry-chef");
    formData.append("buyButtonActive[]", "1");
    formData.append("buyButtonSortOrder[]", "0");

    formData.append("buyButtonText[]", "Мои тесты");
    formData.append("buyButtonActionType[]", "BOT_COMMAND");
    formData.append("buyButtonActionValue[]", "/recipe");
    formData.append("buyButtonActive[]", "0");
    formData.append("buyButtonSortOrder[]", "1");

    expect(parseBuyButtonsFromFormData(formData)).toEqual([
      {
        text: "Кондитер",
        actionType: "TARIFF_PURCHASE",
        actionValue: "pastry-chef",
        active: true,
        sortOrder: 0,
      },
      {
        text: "Мои тесты",
        actionType: "BOT_COMMAND",
        actionValue: "/recipe",
        active: false,
        sortOrder: 1,
      },
    ]);
  });
});
