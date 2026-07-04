export type PromptFeature = "recipes" | "vision" | "photoshoot" | "carousel";
export type PromptProvider = "openai" | "openrouter" | "kie";

export type PromptRecord = {
  id: string;
  slug: string;
  feature: PromptFeature;
  title: string;
  provider: PromptProvider;
  systemPrompt: string;
  userTemplate: string;
  model: string;
  temperature: number;
  active: boolean;
  version: number;
};

type RawPromptRecord = Omit<PromptRecord, "feature" | "provider"> & {
  feature: string;
  provider: string;
};

type PromptDelegate = {
  findFirst(args: {
    where: { feature: PromptFeature; slug: string; active: true };
    orderBy: { version: "desc" };
  }): Promise<RawPromptRecord | null>;
};

export function createPromptRepository(promptDelegate: PromptDelegate) {
  return {
    async findActiveBySlug(
      feature: PromptFeature,
      slug: string,
    ): Promise<PromptRecord | null> {
      const prompt = await promptDelegate.findFirst({
        where: { feature, slug, active: true },
        orderBy: { version: "desc" },
      });

      if (!prompt || !isPromptFeature(prompt.feature)) {
        return null;
      }

      if (!isPromptProvider(prompt.provider)) {
        throw new Error(`Unsupported prompt provider: ${prompt.provider}`);
      }

      return {
        ...prompt,
        feature: prompt.feature,
        provider: prompt.provider,
      };
    },
  };
}

function isPromptFeature(value: string): value is PromptFeature {
  return ["recipes", "vision", "photoshoot", "carousel"].includes(value);
}

function isPromptProvider(value: string): value is PromptProvider {
  return ["openai", "openrouter", "kie"].includes(value);
}
