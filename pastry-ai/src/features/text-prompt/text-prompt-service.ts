import { z } from "zod";
import type { TextPromptAgentInput } from "@/ai/agents/text-prompt-agent";

const textPromptInputSchema = z.object({
  text: z.string().trim().min(1, "Text is required"),
});

type TextPromptAgent = {
  execute(input: TextPromptAgentInput): Promise<string>;
};

export function createTextPromptService(dependencies: {
  textPromptAgent: TextPromptAgent;
}) {
  return {
    async execute(input: {
      feature: "recipe-margin" | "recipe-recalculation";
      text: string;
      promptSlug?: string;
      recipeContext?: string;
    }): Promise<string> {
      const parsed = textPromptInputSchema.parse(input);
      return dependencies.textPromptAgent.execute({
        feature: input.feature,
        text: parsed.text.trim(),
        promptSlug: input.promptSlug,
        recipeContext: input.recipeContext,
      });
    },
  };
}