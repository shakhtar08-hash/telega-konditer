import { describe, expect, it } from "vitest";
import type { AIService } from "../provider/ai-service";
import { createTextPromptAgent } from "./text-prompt-agent";

describe("TextPromptAgent", () => {
  it("appends recipe context for recalculation prompts when the template omits it", async () => {
    const prompts: string[] = [];
    const agent = createTextPromptAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_recipe_recalculation",
          slug: "recipe-recalculation",
          feature: "recipe-recalculation",
          title: "Пересчёт рецепта",
          provider: "openrouter",
          systemPrompt: "You are a pastry chef.",
          userTemplate: "Сообщение пользователя: {{text}}",
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
      feature: "recipe-recalculation",
      text: "Пересчитай на форму 20 см",
      recipeContext: "Исходный рецепт: шоколадный бисквит",
    });

    expect(prompts[0]).toContain("Пересчитай на форму 20 см");
    expect(prompts[0]).toContain("Исходный рецепт: шоколадный бисквит");
  });
});
