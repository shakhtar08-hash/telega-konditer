import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import type { PhotoshootOutput } from "../schemas/photoshoot";

type PromptLoader = {
  load(feature: "photoshoot", slug: string): Promise<PromptRecord>;
};

export type PhotoshootAgentInput = {
  imageUrl: string;
  style: string;
};

export function createPhotoshootAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: PhotoshootAgentInput): Promise<PhotoshootOutput> {
      const prompt = await dependencies.promptLoader.load(
        "photoshoot",
        "product-photo",
      );
      const renderedPrompt = prompt.userTemplate
        .replace("{{imageUrl}}", input.imageUrl)
        .replace("{{style}}", input.style);
      const image = await dependencies.aiService.generateImage({
        prompt: renderedPrompt,
        provider: prompt.provider,
        model: prompt.model,
      });

      return { imageUrl: image.url, prompt: renderedPrompt };
    },
  };
}
