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
          text: "Р”Р°Р»РµРµ",
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
        text: "Р”Р°Р»РµРµ",
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
          text: "РћРїР»Р°С‚РёС‚СЊ",
          url: "https://example.com/pay",
          active: true,
          sortOrder: 0,
        },
      ]),
    ).toEqual([
      {
        text: "РћРїР»Р°С‚РёС‚СЊ",
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
    formData.append("buyButtonText[]", "РљРѕРЅРґРёС‚РµСЂ");
    formData.append("buyButtonActionType[]", "TARIFF_PURCHASE");
    formData.append("buyButtonActionValue[]", "pastry-chef");
    formData.append("buyButtonActive[]", "1");
    formData.append("buyButtonSortOrder[]", "0");

    formData.append("buyButtonText[]", "РњРѕРё С‚РµСЃС‚С‹");
    formData.append("buyButtonActionType[]", "BOT_COMMAND");
    formData.append("buyButtonActionValue[]", "/recipe");
    formData.append("buyButtonActive[]", "0");
    formData.append("buyButtonSortOrder[]", "1");

    expect(parseBuyButtonsFromFormData(formData)).toEqual([
      {
        text: "РљРѕРЅРґРёС‚РµСЂ",
        actionType: "TARIFF_PURCHASE",
        actionValue: "pastry-chef",
        active: true,
        sortOrder: 0,
      },
      {
        text: "РњРѕРё С‚РµСЃС‚С‹",
        actionType: "BOT_COMMAND",
        actionValue: "/recipe",
        active: false,
        sortOrder: 1,
      },
    ]);
  });
});
