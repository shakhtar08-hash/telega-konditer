import { z } from "zod";
import type { AskChefAgentInput } from "@/ai/agents/ask-chef-agent";

const askChefInputSchema = z.object({
  question: z.string().trim().min(1, "Question is required"),
});

type AskChefAgent = {
  execute(input: AskChefAgentInput): Promise<string>;
};

export function createAskChefService(dependencies: {
  askChefAgent: AskChefAgent;
}) {
  return {
    async askQuestion(input: {
      question: string;
      promptSlug?: string;
      recipeContext?: string;
    }): Promise<string> {
      const parsed = askChefInputSchema.parse(input);
      return dependencies.askChefAgent.execute({
        question: parsed.question.trim(),
        promptSlug: input.promptSlug,
        recipeContext: input.recipeContext,
      });
    },
  };
}