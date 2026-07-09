import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";

type PromptLoader = {
  load(feature: "recipe-margin" | "recipe-recalculation", slug: string): Promise<PromptRecord>;
};

export type TextPromptAgentInput = {
  feature: "recipe-margin" | "recipe-recalculation";
  text: string;
  promptSlug?: string;
  recipeContext?: string;
};

export function createTextPromptAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: TextPromptAgentInput): Promise<string> {
      const prompt = await dependencies.promptLoader.load(
        input.feature,
        input.promptSlug ?? input.feature,
      );
      const renderedPrompt = renderPromptWithRecipeContext(
        prompt.userTemplate
          .replace("{{text}}", input.text)
          .replace("{{recipeContext}}", input.recipeContext ?? ""),
        input.recipeContext,
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

function renderPromptWithRecipeContext(
  promptText: string,
  recipeContext?: string,
) {
  if (!recipeContext?.trim()) {
    return promptText;
  }

  if (promptText.includes(recipeContext)) {
    return promptText;
  }

  return `${promptText}\n\nКонтекст рецепта:\n${recipeContext}`;
}
