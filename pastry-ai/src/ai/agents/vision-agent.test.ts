import { describe, expect, it } from "vitest";
import { createVisionAgent } from "./vision-agent";

describe("VisionAgent", () => {
  it("passes the dessert photo URL to OpenRouter multimodal generation", async () => {
    const calls: Array<{ imageUrl?: string; model: string; provider: string }> = [];
    const agent = createVisionAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_vision",
          slug: "dessert-identification",
          feature: "vision",
          title: "Разобрать десерт по фото",
          provider: "openrouter",
          systemPrompt: "Analyze dessert photo.",
          userTemplate: "Photo: {{imageUrl}}",
          model: "google/gemini-2.5-pro",
          temperature: 0.2,
          active: true,
          version: 1,
        }),
      },
      aiService: {
        generateText: async () => "",
        generateImage: async () => ({ url: "" }),
        generateObject: async (input) => {
          calls.push({
            imageUrl: input.imageUrl,
            model: input.model,
            provider: input.provider,
          });

          return input.schema.parse({
            chefTips: ["Охладите мусс перед глазировкой."],
            composition: {
              base: ["миндальный дакуаз"],
              coating: ["велюр"],
              cream: ["мусс из белого шоколада"],
              decor: ["шоколадный декор"],
              filling: ["манго-маракуйя"],
            },
            confidence: {
              level: "medium",
              reason: "Виден внешний вид, но нет разреза.",
            },
            difficulty: {
              level: "professional",
              reason: "Нужны формы и работа с велюром.",
            },
            fillingHypotheses: ["манго-маракуйя", "лимонный курд"],
            recipeIdea: {
              ingredients: ["сливки 33%", "белый шоколад", "желатин"],
              method: ["Приготовить мусс", "Собрать в форме", "Покрыть велюром"],
              title: "Муссовое пирожное с манго",
            },
            similarDesserts: ["муссовое пирожное", "мини-энтреме"],
            summary: "Похоже на современное муссовое пирожное.",
            techniques: ["муссовая технология", "велюровое покрытие"],
          });
        },
      },
    });

    const result = await agent.execute({
      imageUrl: "https://example.com/dessert.jpg",
    });

    expect(calls).toEqual([
      {
        imageUrl: "https://example.com/dessert.jpg",
        model: "google/gemini-2.5-pro",
        provider: "openrouter",
      },
    ]);
    expect(result.recipeIdea.title).toBe("Муссовое пирожное с манго");
  });
});
