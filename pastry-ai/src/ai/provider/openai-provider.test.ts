import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { createOpenAIAIService } from "./openai-provider";

const { generateObjectMock, generateImageMock } = vi.hoisted(() => ({
  generateImageMock: vi.fn(),
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateImage: generateImageMock,
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
  it("uses the OpenAI image edits API when a source image URL is provided", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Blob(["image"], { type: "image/png" })),
      )
      .mockResolvedValueOnce(
        Response.json({ data: [{ b64_json: "generated-image" }] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createOpenAIAIService().generateImage({
      imageUrl: "https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl/dessert.png",
      model: "gpt-image-1",
      prompt: "Make it premium.",
      provider: "openai",
    });

    expect(result).toEqual({
      url: "data:image/png;base64,generated-image",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl/dessert.png",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.openai.com/v1/images/edits",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-key",
        },
        method: "POST",
      }),
    );

    vi.unstubAllGlobals();
  });

  it("sends image URLs as multimodal message content for structured vision", async () => {
    generateObjectMock.mockResolvedValue({ object: { title: "Dessert" } });

    await createOpenAIAIService().generateObject({
      imageUrl: "https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl/photo.jpg",
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
                type: "file",
                mediaType: "image",
                data: new URL("https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl/photo.jpg"),
              },
            ],
          },
        ],
      }),
    );
  });
});
