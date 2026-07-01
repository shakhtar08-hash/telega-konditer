import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { createOpenAIAIService } from "./openai-provider";

const { generateObjectMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateImage: vi.fn(),
  generateObject: generateObjectMock,
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => (model: string) => ({ model }),
  openai: (model: string) => ({ model }),
}));

vi.mock("@/lib/api-secrets", () => ({
  resolveManagedApiKey: async () => "test-key",
}));

describe("createOpenAIAIService", () => {
  it("sends image URLs as multimodal message content for structured vision", async () => {
    generateObjectMock.mockResolvedValue({ object: { title: "Dessert" } });

    await createOpenAIAIService().generateObject({
      imageUrl: "https://example.com/photo.jpg",
      model: "google/gemini-2.5-pro",
      prompt: "Analyze this dessert.",
      provider: "openrouter",
      schema: z.object({ title: z.string() }),
      system: "You are a pastry chef.",
      temperature: 0.2,
    });

    expect(generateObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this dessert." },
              {
                type: "image",
                image: new URL("https://example.com/photo.jpg"),
              },
            ],
          },
        ],
      }),
    );
  });
});
