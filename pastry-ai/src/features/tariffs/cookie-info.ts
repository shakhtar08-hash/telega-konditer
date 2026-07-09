type CookieCost =
  | { type: "free" }
  | { type: "paid"; cost: number }
  | { type: "paid-dynamic" }
  | { type: "recipe" };

const FEATURE_COST_MAP: Record<string, CookieCost> = {
  "ask-chef": { type: "free" },
  "free-lesson": { type: "free" },
  vision: { type: "free" },
  "recipe-recalculation": { type: "free" },
  "margin-calculator": { type: "free" },
  "recipe-margin": { type: "free" },
  "recipe-card": { type: "paid", cost: 1 },
  "photoshoot-pick-style": { type: "paid", cost: 1 },
  photoshoot: { type: "paid-dynamic" },
  carousel: { type: "free" },
  "recipe-from-ingredients": { type: "recipe" },
  "best-recipe-search": { type: "recipe" },
  recipes: { type: "recipe" },
};

export function getFeatureCookieCost(feature: string, activeStyleCount: number): string {
  const entry = FEATURE_COST_MAP[feature];
  if (!entry) return "Эта функция бесплатна";
  if (entry.type === "free") return "Эта функция бесплатна";
  if (entry.type === "paid-dynamic") {
    return `Эта функция съест ${pluralizeCookiesAccusative(activeStyleCount)}`;
  }
  if (entry.type === "paid") {
    return `Эта функция съест ${pluralizeCookiesAccusative(entry.cost)}`;
  }
  return "Функция бесплатна для текста";
}

export function getFeatureCookieExtraLine(feature: string): string | null {
  const entry = FEATURE_COST_MAP[feature];
  if (entry?.type === "recipe") {
    return "Дополнительно может потратиться до 4 печенек на фото примеры";
  }
  return null;
}

export function getFeatureMaxPhotoCharge(feature: string): number | null {
  const entry = FEATURE_COST_MAP[feature];
  if (entry?.type === "recipe") return 4;
  return null;
}

export function buildUserCookieLine(remainingTokens: number | null): string {
  if (remainingTokens === null) {
    return "На вашем счету: 0 печенек";
  }
  return `На вашем счету: ${pluralizeCookies(remainingTokens)}`;
}

export function buildFeatureCookieBlock(
  feature: string,
  activeStyleCount: number,
  remainingTokens: number | null,
): string {
  const lines: string[] = [getFeatureCookieCost(feature, activeStyleCount)];
  const extra = getFeatureCookieExtraLine(feature);
  if (extra) lines.push(extra);
  lines.push(buildUserCookieLine(remainingTokens));
  return lines.join("\n");
}

function pluralizeCookies(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} печенька`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} печеньки`;
  return `${count} печенек`;
}

function pluralizeCookiesAccusative(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} печеньку`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} печеньки`;
  return `${count} печенек`;
}