import { describe, expect, it } from "vitest";
import { createPhotoshootService } from "./photoshoot-service";

describe("PhotoshootService", () => {
  it("loads seven active photo styles before generating dessert variants", async () => {
    const requestedLimits: number[] = [];
    const agentInputs: unknown[] = [];
    const service = createPhotoshootService({
      photoStyleRepository: {
        listActive: async (limit) => {
          requestedLimits.push(limit);
          return Array.from({ length: limit }, (_, index) => ({
            id: `style_${index + 1}`,
            name: `Стиль ${index + 1}`,
            prompt: `Описание стиля ${index + 1}`,
          }));
        },
      },
      photoshootAgent: {
        execute: async (input) => {
          agentInputs.push(input);
          return { images: [] };
        },
      },
    });

    await service.generateStyledDessertPhotos({
      imageUrl: "https://example.com/dessert.jpg",
    });

    expect(requestedLimits).toEqual([7]);
    expect(agentInputs).toEqual([
      {
        imageUrl: "https://example.com/dessert.jpg",
        styles: Array.from({ length: 7 }, (_, index) => ({
          id: `style_${index + 1}`,
          name: `Стиль ${index + 1}`,
          prompt: `Описание стиля ${index + 1}`,
        })),
      },
    ]);
  });
});
