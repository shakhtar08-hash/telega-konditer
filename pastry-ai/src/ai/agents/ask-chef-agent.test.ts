import { describe, expect, it } from "vitest";
import type { AIService } from "../provider/ai-service";
import { createAskChefAgent } from "./ask-chef-agent";

describe("AskChefAgent", () => {
  it("appends saved recipe context when the prompt template has no placeholder", async () => {
    const prompts: string[] = [];
    const agent = createAskChefAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_ask_chef",
          slug: "ask-chef",
          feature: "ask-chef",
          title: "Спросить кондитера",
          provider: "openrouter",
          systemPrompt: "You are a pastry chef.",
          userTemplate: "Вопрос пользователя: {{question}}",
          model: "google/gemini-2.5-pro",
          temperature: 0.3,
          active: true,
          version: 1,
        }),
      },
      aiService: {
        generateText: async (input: Record<string, unknown>) => {
          prompts.push(input.prompt as string);
          return "ok";
        },
        generateObject: async () => {
          throw new Error("not used");
        },
        generateImage: async () => {
          throw new Error("not used");
        },
      } as AIService,
    });

    await agent.execute({
      question: "Почему крем течет?",
      recipeContext: "Выбранный рецепт: клубничный тарт",
    });

    expect(prompts[0]).toContain("Почему крем течет?");
    expect(prompts[0]).toContain("Выбранный рецепт: клубничный тарт");
  });
});
