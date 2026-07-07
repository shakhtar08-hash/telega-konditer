export type CardSize = "compact" | "normal" | "long";

export type SizeConfigEntry = {
  width: number;
  minHeight: number;
  padding: number;
  titleFontSize: number;
  bodyFontSize: number;
  stepFontSize: number;
  gap: number;
  heroHeight: number;
  maxTips: number;
};

export const sizeConfig: Record<CardSize, SizeConfigEntry> = {
  compact: {
    width: 1080,
    minHeight: 1450,
    padding: 80,
    titleFontSize: 60,
    bodyFontSize: 25,
    stepFontSize: 24,
    gap: 34,
    heroHeight: 320,
    maxTips: 4,
  },
  normal: {
    width: 1080,
    minHeight: 1620,
    padding: 70,
    titleFontSize: 56,
    bodyFontSize: 24,
    stepFontSize: 23,
    gap: 30,
    heroHeight: 280,
    maxTips: 3,
  },
  long: {
    width: 1080,
    minHeight: 2100,
    padding: 56,
    titleFontSize: 48,
    bodyFontSize: 21,
    stepFontSize: 20,
    gap: 22,
    heroHeight: 220,
    maxTips: 2,
  },
};
