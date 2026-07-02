import { describe, expect, it } from "vitest";
import { createVisionAgent } from "./vision-agent";

describe("VisionAgent", () => {
  it("passes the dessert photo URL to OpenRouter multimodal text generation", async () => {
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
        generateText: async (input) => {
          calls.push({
            imageUrl: input.imageUrl,
            model: input.model,
            provider: input.provider,
          });

          return "Это муссовый десерт с велюром.";
        },
        generateImage: async () => ({ url: "" }),
        generateObject: async () => {
          throw new Error(
            "generateObject should not be used for dessert identification",
          );
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
    expect(result).toBe("Это муссовый десерт с велюром.");
  });
});
