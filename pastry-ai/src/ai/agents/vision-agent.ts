import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import { visionOutputSchema, type VisionOutput } from "../schemas/vision";

type PromptLoader = {
  load(feature: "vision", slug: string): Promise<PromptRecord>;
};

export type VisionAgentInput = {
  imageUrl: string;
};

export function createVisionAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: VisionAgentInput): Promise<VisionOutput> {
      const prompt = await dependencies.promptLoader.load(
        "vision",
        "dessert-identification",
      );

      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: prompt.userTemplate.replace("{{imageUrl}}", input.imageUrl),
        model: prompt.model,
        temperature: prompt.temperature,
        schema: visionOutputSchema,
      });
    },
  };
}
