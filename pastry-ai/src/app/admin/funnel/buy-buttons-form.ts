export type FunnelBuyButton = {
  text: string;
  url: string;
  active: boolean;
  sortOrder: number;
};

export function parseBuyButtons(raw: unknown): FunnelBuyButton[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((button: Record<string, unknown>, index: number) => ({
      text: String(button.text ?? ""),
      url: String(button.url ?? ""),
      active: button.active !== false,
      sortOrder: typeof button.sortOrder === "number" ? button.sortOrder : index,
    }));
  }
  try {
    const parsed = JSON.parse(raw as string);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((button: Record<string, unknown>, index: number) => ({
      text: String(button.text ?? ""),
      url: String(button.url ?? ""),
      active: button.active !== false,
      sortOrder: typeof button.sortOrder === "number" ? button.sortOrder : index,
    }));
  } catch {
    return [];
  }
}

export function parseBuyButtonsFromFormData(formData: FormData): FunnelBuyButton[] {
  const texts = formData.getAll("buyButtonText[]").map((value) => String(value).trim());
  const urls = formData.getAll("buyButtonUrl[]").map((value) => String(value).trim());
  const activeValues = formData.getAll("buyButtonActive[]").map((value) => String(value));
  const sortOrders = formData
    .getAll("buyButtonSortOrder[]")
    .map((value, index) => {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? index : parsed;
    });

  if (texts.length === 0 && urls.length === 0 && activeValues.length === 0) {
    const buyButtonsRaw = String(formData.get("buyButtons") ?? "[]");
    return parseBuyButtons(buyButtonsRaw);
  }

  return texts.map((text, index) => ({
    text,
    url: urls[index] ?? "",
    active: activeValues[index] !== "0",
    sortOrder: sortOrders[index] ?? index,
  }));
}
