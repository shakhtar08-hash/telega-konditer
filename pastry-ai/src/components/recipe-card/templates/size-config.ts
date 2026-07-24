export type CardSize = "compact" | "normal";

export type SizeConfigEntry = {
  width: number;
  height: number;
  padding: number;
  titleFontSize: number;
  bodyFontSize: number;
  stepFontSize: number;
  continuationTitleFontSize: number;
  gap: number;
  heroHeight: number;
  footerHeight: number;
  safeBottomSpace: number;
};

export const sizeConfig: Record<CardSize, SizeConfigEntry> = {
  compact: {
    width: 1080,
    height: 1450,
    padding: 80,
    titleFontSize: 60,
    bodyFontSize: 25,
    stepFontSize: 24,
    continuationTitleFontSize: 48,
    gap: 34,
    heroHeight: 320,
    footerHeight: 100,
    safeBottomSpace: 50,
  },
  normal: {
    width: 1080,
    height: 1620,
    padding: 70,
    titleFontSize: 56,
    bodyFontSize: 24,
    stepFontSize: 23,
    continuationTitleFontSize: 44,
    gap: 30,
    heroHeight: 280,
    footerHeight: 90,
    safeBottomSpace: 50,
  },
};
