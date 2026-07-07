import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";
import type { RecipeCardOutput } from "../schemas/recipe-card";
import { recipeCardOutputSchema } from "../schemas/recipe-card";

type PromptLoader = {
  load(feature: "recipe-card", slug: string): Promise<PromptRecord>;
};

export type RecipeCardAgentInput = {
  recipeText: string;
  promptSlug?: string;
};

export function createRecipeCardAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: RecipeCardAgentInput): Promise<RecipeCardOutput> {
      const prompt = await dependencies.promptLoader.load(
        "recipe-card",
        input.promptSlug ?? "recipe-card",
      );

      const renderedPrompt = prompt.userTemplate.replace(
        "{{recipe}}",
        input.recipeText,
      );

      return dependencies.aiService.generateObject({
        system: prompt.systemPrompt,
        prompt: renderedPrompt,
        schema: recipeCardOutputSchema,
        provider: prompt.provider,
        model: prompt.model,
        temperature: prompt.temperature,
      });
    },
  };
}