export type PromptFeature = "recipes" | "vision" | "photoshoot" | "carousel";
export type PromptProvider = "openai" | "openrouter" | "fal";

export type PromptRecord = {
  id: string;
  slug: string;
  feature: PromptFeature;
  provider: PromptProvider;
  systemPrompt: string;
  userTemplate: string;
  model: string;
  temperature: number;
  active: boolean;
  version: number;
};

type PromptDelegate = {
  findFirst(args: {
    where: { feature: PromptFeature; slug: string; active: true };
    orderBy: { version: "desc" };
  }): Promise<PromptRecord | null>;
};

export function createPromptRepository(promptDelegate: PromptDelegate) {
  return {
    findActiveBySlug(
      feature: PromptFeature,
      slug: string,
    ): Promise<PromptRecord | null> {
      return promptDelegate.findFirst({
        where: { feature, slug, active: true },
        orderBy: { version: "desc" },
      });
    },
  };
}
