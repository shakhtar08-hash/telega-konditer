import { describe, expect, it } from "vitest";
import { createPhotoshootAgent } from "./photoshoot-agent";

describe("PhotoshootAgent", () => {
  it("rejects unsupported providers for dessert photo styling", async () => {
    const agent = createPhotoshootAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_photoshoot",
          slug: "product-photo",
          feature: "photoshoot",
          title: "Стилизация фото десерта",
          provider: "openrouter",
          systemPrompt: "Edit dessert photos.",
          userTemplate: "Исходное фото: {{imageUrl}}\nСтиль: {{style}}",
          model: "google/gemini-2.5-pro",
          temperature: 0.2,
          active: true,
          version: 1,
        }),
      },
      aiService: {
        generateText: async () => "",
        generateObject: async (input) => input.schema.parse({}),
        generateImage: async () => {
          throw new Error("should not be called");
        },
      },
    });

    await expect(
      agent.execute({
        imageUrl: "https://example.com/dessert.jpg",
        styles: [
          {
            id: "style_1",
            name: "Каталог",
            prompt: "Чистый светлый фон для каталога.",
          },
        ],
      }),
    ).rejects.toThrow(
      'Сценарий "Создать фото" сейчас работает только через OpenAI с моделью gpt-image-1.',
    );
  });

  it("generates one edited image for each selected dessert photo style", async () => {
    const calls: Array<{ imageUrl?: string; prompt: string }> = [];
    const agent = createPhotoshootAgent({
      promptLoader: {
        load: async () => ({
          id: "prompt_photoshoot",
          slug: "product-photo",
          feature: "photoshoot",
          title: "Стилизация фото десерта",
          provider: "openai",
          systemPrompt: "Edit dessert photos.",
          userTemplate: "Исходное фото: {{imageUrl}}\nСтиль: {{style}}",
          model: "gpt-image-1",
          temperature: 0.2,
          active: true,
          version: 1,
        }),
      },
      aiService: {
        generateText: async () => "",
        generateObject: async (input) => input.schema.parse({}),
        generateImage: async (input) => {
          calls.push({ imageUrl: input.imageUrl, prompt: input.prompt });
          return {
            url: `data:image/png;base64,style-${calls.length}`,
          };
        },
      },
    });

    const result = await agent.execute({
      imageUrl: "https://example.com/dessert.jpg",
      styles: [
        {
          id: "style_1",
          name: "Тёмный премиум",
          prompt: "Чёрный камень, тёплый контровой свет.",
        },
        {
          id: "style_2",
          name: "Каталог",
          prompt: "Чистый светлый фон для каталога.",
        },
      ],
    });

    expect(calls).toEqual([
      {
        imageUrl: "https://example.com/dessert.jpg",
        prompt:
          "Исходное фото: https://example.com/dessert.jpg\nСтиль: Тёмный премиум: Чёрный камень, тёплый контровой свет.",
      },
      {
        imageUrl: "https://example.com/dessert.jpg",
        prompt:
          "Исходное фото: https://example.com/dessert.jpg\nСтиль: Каталог: Чистый светлый фон для каталога.",
      },
    ]);
    expect(result.images).toEqual([
      {
        imageUrl: "data:image/png;base64,style-1",
        prompt:
          "Исходное фото: https://example.com/dessert.jpg\nСтиль: Тёмный премиум: Чёрный камень, тёплый контровой свет.",
        styleId: "style_1",
        styleName: "Тёмный премиум",
      },
      {
        imageUrl: "data:image/png;base64,style-2",
        prompt:
          "Исходное фото: https://example.com/dessert.jpg\nСтиль: Каталог: Чистый светлый фон для каталога.",
        styleId: "style_2",
        styleName: "Каталог",
      },
    ]);
  });
});
