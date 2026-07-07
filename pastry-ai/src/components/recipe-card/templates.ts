export type CardTemplate = "minimal" | "pinterest" | "luxury" | "dark";

export type { CardSize } from "./templates/size-config";
export { sizeConfig } from "./templates/size-config";
export { determineCardSize } from "./templates/utils";

export const templateNames: Record<CardTemplate, string> = {
  minimal: "Minimal",
  pinterest: "Pinterest",
  luxury: "Luxury",
  dark: "Dark Premium",
};