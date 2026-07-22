export type TariffPurchaseSlug = "basic" | "master" | "chief";

export const TARIFF_PURCHASE_OPTIONS = [
  { value: "basic", label: "Кондитер" },
  { value: "master", label: "Мастер" },
  { value: "chief", label: "Шеф-кондитер" },
] as const;

const TARIFF_PURCHASE_SLUG_SET = new Set<TariffPurchaseSlug>(
  TARIFF_PURCHASE_OPTIONS.map((option) => option.value),
);

export function isTariffPurchaseSlug(value: string): value is TariffPurchaseSlug {
  return TARIFF_PURCHASE_SLUG_SET.has(value as TariffPurchaseSlug);
}

export function normalizeTariffPurchaseSlug(
  value: string | null | undefined,
): TariffPurchaseSlug | null {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  switch (normalizedValue) {
    case "basic":
    case "master":
    case "chief":
      return normalizedValue;
    case "pastry-chef":
      return "basic";
    case "head-chef":
      return "chief";
    default:
      return null;
  }
}

export function buildTariffPurchaseCallbackData(
  tariffSlug: TariffPurchaseSlug,
): string {
  const callbackData = `tariff:buy:${tariffSlug}`;

  if (Buffer.byteLength(callbackData, "utf8") > 64) {
    throw new Error("Tariff purchase callback payload exceeds Telegram limit");
  }

  return callbackData;
}

export function parseTariffPurchaseCallbackData(
  callbackData: string,
): TariffPurchaseSlug | null {
  const match = callbackData.match(/^tariff:buy:(.+)$/);
  const tariffSlug = match?.[1];

  if (!tariffSlug) {
    return null;
  }

  return normalizeTariffPurchaseSlug(tariffSlug);
}
