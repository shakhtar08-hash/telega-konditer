import type {
  PromptFeature,
  PromptRecord,
} from "@/db/repositories/prompt-repository";

type PromptRepository = {
  findActiveBySlug(
    feature: PromptFeature,
    slug: string,
  ): Promise<PromptRecord | null>;
};

export function createPromptLoader(repository: PromptRepository) {
  return {
    async load(feature: PromptFeature, slug: string): Promise<PromptRecord> {
      const prompt = await repository.findActiveBySlug(feature, slug);

      if (!prompt) {
        throw new Error(`Prompt not found: ${feature}/${slug}`);
      }

      return prompt;
    },
  };
}
