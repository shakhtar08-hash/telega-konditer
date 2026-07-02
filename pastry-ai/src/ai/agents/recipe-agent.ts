import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import type { RecipeOutput } from "../schemas/recipe";

type PromptLoader = {
  load(feature: "recipes", slug: string): Promise<PromptRecord>;
};

export type RecipeAgentInput = {
  ingredientsText: string;
  promptSlug?: string;
};

export function createRecipeAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: RecipeAgentInput): Promise<RecipeOutput> {
      const prompt = await dependencies.promptLoader.load(
        "recipes",
        input.promptSlug ?? "recipe-from-ingredients",
      );
      const renderedPrompt = prompt.userTemplate.replace(
        "{{ingredients}}",
        input.ingredientsText,
      );

      return dependencies.aiService.generateText({
        system: prompt.systemPrompt,
        prompt: renderedPrompt,
        provider: prompt.provider,
        model: prompt.model,
        temperature: prompt.temperature,
      });
    },
  };
}
