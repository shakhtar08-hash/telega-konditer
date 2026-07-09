import type { PromptRecord } from "@/db/repositories/prompt-repository";
import type { AIService } from "../provider/ai-service";

type PromptLoader = {
  load(feature: "ask-chef", slug: string): Promise<PromptRecord>;
};

export type AskChefAgentInput = {
  question: string;
  promptSlug?: string;
  recipeContext?: string;
};

export function createAskChefAgent(dependencies: {
  promptLoader: PromptLoader;
  aiService: AIService;
}) {
  return {
    async execute(input: AskChefAgentInput): Promise<string> {
      const prompt = await dependencies.promptLoader.load(
        "ask-chef",
        input.promptSlug ?? "ask-chef",
      );
      const renderedPrompt = renderPromptWithRecipeContext(
        prompt.userTemplate
          .replace("{{question}}", input.question)
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
