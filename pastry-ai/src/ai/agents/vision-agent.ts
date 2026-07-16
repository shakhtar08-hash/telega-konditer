import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import { appendLisaPersonaInstruction } from "./lisa-persona";

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
    async execute(input: VisionAgentInput): Promise<string> {
      const prompt = await dependencies.promptLoader.load(
        "vision",
        "dessert-identification",
      );

      return dependencies.aiService.generateText({
        imageUrl: input.imageUrl,
        system: appendLisaPersonaInstruction(prompt.systemPrompt),
        prompt: prompt.userTemplate.replace("{{imageUrl}}", input.imageUrl),
        provider: prompt.provider,
        model: prompt.model,
        temperature: prompt.temperature,
      });
    },
  };
}
