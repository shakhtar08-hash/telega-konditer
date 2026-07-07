import { z } from "zod";
import type { FreeLessonAgentInput } from "@/ai/agents/free-lesson-agent";

const freeLessonInputSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required"),
});

type FreeLessonAgent = {
  execute(input: FreeLessonAgentInput): Promise<string>;
};

export function createFreeLessonService(dependencies: {
  freeLessonAgent: FreeLessonAgent;
}) {
  return {
    async searchLessons(input: {
      topic: string;
      promptSlug?: string;
    }): Promise<string> {
      const parsed = freeLessonInputSchema.parse(input);
      return dependencies.freeLessonAgent.execute({
        topic: parsed.topic.trim(),
        promptSlug: input.promptSlug,
      });
    },
  };
}