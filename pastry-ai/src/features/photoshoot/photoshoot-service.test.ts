import { describe, expect, it } from "vitest";
import { createPhotoshootService } from "./photoshoot-service";

describe("PhotoshootService", () => {
  it("loads all active photo styles with no limit before generating variants", async () => {
    const agentInputs: unknown[] = [];
    const mockStyles = Array.from({ length: 10 }, (_, index) => ({
      id: `style_${index + 1}`,
      name: `Стиль ${index + 1}`,
      prompt: `Описание стиля ${index + 1}`,
    }));
    const service = createPhotoshootService({
      photoStyleRepository: {
        listActive: async () => mockStyles,
        findById: async () => null,
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

    expect(agentInputs).toEqual([
      {
        imageUrl: "https://example.com/dessert.jpg",
        styles: mockStyles,
      },
    ]);
  });

  it("throws when no active styles configured", async () => {
    const service = createPhotoshootService({
      photoStyleRepository: {
        listActive: async () => [],
        findById: async () => null,
      },
      photoshootAgent: {
        execute: async () => ({ images: [] }),
      },
    });

    await expect(
      service.generateStyledDessertPhotos({
        imageUrl: "https://example.com/dessert.jpg",
      }),
    ).rejects.toThrow("No active photo styles are configured");
  });
});