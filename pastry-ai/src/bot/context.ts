import type { Context, SessionFlavor } from "grammy";

export type BotSession = {
  lastFeature?: "recipes" | "vision" | "photoshoot" | "carousel";
  lastPromptSlug?: string;
  lastRecipeRequestText?: string;
};

export type PastryBotContext = Context & SessionFlavor<BotSession>;
