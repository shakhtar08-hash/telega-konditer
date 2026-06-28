import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import {
  carouselOutputSchema,
  type CarouselOutput,
} from "../schemas/carousel";

type PromptLoader = {
  load(feature: "carousel", slug: string): Promise<PromptRecord>;
};

export type CarouselAgentInput = {
  topic: string;
};

export function createCarouselAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: CarouselAgentInput): Promise<CarouselOutput> {
      const prompt = await dependencies.promptLoader.load(
        "carousel",
        "instagram-carousel",
      );

      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: prompt.userTemplate.replace("{{topic}}", input.topic),
        model: prompt.model,
        temperature: prompt.temperature,
        schema: carouselOutputSchema,
      });
    },
  };
}
