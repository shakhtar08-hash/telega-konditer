export type FunnelBuyButtonActionType =
  | "URL"
  | "NEXT"
  | "ACTIVATE_PROMO_AND_NEXT"
  | "TARIFF_PURCHASE"
  | "BOT_COMMAND";

export type FunnelNextAction = "next" | "activate_promo_and_next";

export type FunnelBuyButton = {
  text: string;
  actionType: FunnelBuyButtonActionType;
  actionValue: string | null;
  active: boolean;
  sortOrder: number;
};

export const FUNNEL_BUTTON_ACTION_OPTIONS: Array<{
  value: Exclude<FunnelBuyButtonActionType, "URL">;
  label: string;
}> = [
  { value: "NEXT", label: "Далее" },
  { value: "ACTIVATE_PROMO_AND_NEXT", label: "Активировать промо + переход" },
  { value: "TARIFF_PURCHASE", label: "Оплата тарифа" },
  { value: "BOT_COMMAND", label: "Команда бота" },
];

const FUNNEL_BUTTON_ACTION_SET = new Set<FunnelBuyButtonActionType>([
  "URL",
  "NEXT",
  "ACTIVATE_PROMO_AND_NEXT",
  "TARIFF_PURCHASE",
  "BOT_COMMAND",
]);

function normalizeButtonActionType(value: unknown): FunnelBuyButtonActionType {
  const actionType = String(value ?? "").trim();
  return FUNNEL_BUTTON_ACTION_SET.has(actionType as FunnelBuyButtonActionType)
    ? (actionType as FunnelBuyButtonActionType)
    : "URL";
}

function normalizeButtonActionValue(
  actionType: FunnelBuyButtonActionType,
  value: unknown,
  legacyUrl?: unknown,
): string | null {
  if (actionType === "NEXT" || actionType === "ACTIVATE_PROMO_AND_NEXT") {
    return null;
  }

  if (actionType === "URL") {
    const url = String(value ?? legacyUrl ?? "").trim();
    return url || "";
  }

  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeButton(
  input: Record<string, unknown>,
  index: number,
): FunnelBuyButton {
  const actionType = normalizeButtonActionType(input.actionType);

  return {
    text: String(input.text ?? "").trim(),
    actionType,
    actionValue: normalizeButtonActionValue(
      actionType,
      input.actionValue,
      input.url,
    ),
    active: input.active !== false,
    sortOrder: typeof input.sortOrder === "number" ? input.sortOrder : index,
  };
}

function normalizeButtonOrder(buttons: FunnelBuyButton[]): FunnelBuyButton[] {
  return [...buttons]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((button, index) => ({
      ...button,
      sortOrder: index,
    }));
}

export function parseStoredFunnelBuyButtons(raw: unknown): FunnelBuyButton[] {
  if (!raw) return [];

  const parsed = Array.isArray(raw)
    ? raw
    : (() => {
        try {
          return JSON.parse(String(raw));
        } catch {
          return [];
        }
      })();

  if (!Array.isArray(parsed)) {
    return [];
  }

  return normalizeButtonOrder(
    parsed
      .map((button, index) =>
        button && typeof button === "object"
          ? normalizeButton(button as Record<string, unknown>, index)
          : null,
      )
      .filter((button): button is FunnelBuyButton => button !== null && button.text.length > 0),
  );
}

export function parsePostedFunnelBuyButtons(formData: FormData): FunnelBuyButton[] {
  const texts = formData.getAll("buyButtonText[]").map((value) => String(value).trim());
  const actionTypes = formData
    .getAll("buyButtonActionType[]")
    .map((value) => normalizeButtonActionType(value));
  const actionValues = formData
    .getAll("buyButtonActionValue[]")
    .map((value) => String(value).trim());
  const legacyUrls = formData.getAll("buyButtonUrl[]").map((value) => String(value).trim());
  const activeValues = formData.getAll("buyButtonActive[]").map((value) => String(value));
  const sortOrders = formData.getAll("buyButtonSortOrder[]").map((value, index) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? index : parsed;
  });

  if (
    texts.length === 0 &&
    actionTypes.length === 0 &&
    actionValues.length === 0 &&
    legacyUrls.length === 0 &&
    activeValues.length === 0
  ) {
    return parseStoredFunnelBuyButtons(formData.get("buyButtons"));
  }

  return normalizeButtonOrder(
    texts
      .map((text, index) => {
        if (!text) {
          return null;
        }

        const actionType =
          actionTypes[index] ??
          (legacyUrls[index] ? "URL" : "NEXT");

        return {
          text,
          actionType,
          actionValue: normalizeButtonActionValue(
            actionType,
            actionValues[index],
            legacyUrls[index],
          ),
          active: activeValues[index] !== "0",
          sortOrder: sortOrders[index] ?? index,
        } satisfies FunnelBuyButton;
      })
      .filter((button): button is FunnelBuyButton => button !== null),
  );
}

export function buildFunnelButtonsForEditor(input: {
  buyButtons: unknown;
  buyButtonText?: string | null;
  buyButtonUrl?: string | null;
  nextButtonText?: string | null;
  nextAction?: string | null;
}): FunnelBuyButton[] {
  const buttons = parseStoredFunnelBuyButtons(input.buyButtons);
  const hasNavigationButton = buttons.some(
    (button) =>
      button.actionType === "NEXT" ||
      button.actionType === "ACTIVATE_PROMO_AND_NEXT",
  );
  const hasLegacyPaymentButton = buttons.some((button) => button.actionType === "URL");
  const merged = [...buttons];

  const nextButtonText = input.nextButtonText?.trim() ?? "";
  if (!hasNavigationButton && nextButtonText) {
    merged.unshift({
      text: nextButtonText,
      actionType:
        input.nextAction === "activate_promo_and_next"
          ? "ACTIVATE_PROMO_AND_NEXT"
          : "NEXT",
      actionValue: null,
      active: true,
      sortOrder: 0,
    });
  }

  const buyButtonText = input.buyButtonText?.trim() ?? "";
  if (!hasLegacyPaymentButton && buyButtonText) {
    merged.push({
      text: buyButtonText,
      actionType: "URL",
      actionValue: input.buyButtonUrl?.trim() ?? "",
      active: true,
      sortOrder: merged.length,
    });
  }

  return normalizeButtonOrder(merged.filter((button) => button.text.trim().length > 0));
}

export function getPrimaryFunnelNavigationButton(
  buttons: FunnelBuyButton[],
): FunnelBuyButton | undefined {
  return buttons.find(
    (button) =>
      button.active &&
      (button.actionType === "NEXT" ||
        button.actionType === "ACTIVATE_PROMO_AND_NEXT"),
  );
}

export function getPrimaryFunnelPaymentButton(
  buttons: FunnelBuyButton[],
): FunnelBuyButton | undefined {
  return buttons.find(
    (button) =>
      button.active &&
      (button.actionType === "URL" || button.actionType === "TARIFF_PURCHASE"),
  );
}
