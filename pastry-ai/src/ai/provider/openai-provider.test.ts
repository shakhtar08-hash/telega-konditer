import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import {
  createOpenAIAIService,
  generateOpenAIImageDirect,
} from "./openai-provider";

const {
  createAITransportMock,
  createOpenAIMock,
  generateObjectMock,
  generateImageMock,
} = vi.hoisted(() => ({
  createAITransportMock: vi.fn(),
  createOpenAIMock: vi.fn(),
  generateImageMock: vi.fn(),
  generateObjectMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateImage: generateImageMock,
  generateObject: generateObjectMock,
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: createOpenAIMock.mockImplementation(() => {
    const provider = ((model: string) => ({ model })) as ((
      model: string,
    ) => { model: string }) & {
      image: (model: string) => { model: string };
    };
    provider.image = (model: string) => ({ model });
    return provider;
  }),
  openai: Object.assign((model: string) => ({ model }), {
    image: (model: string) => ({ model }),
  }),
}));

vi.mock("@/lib/api-secrets", () => ({
  resolveManagedApiKey: async () => "test-key",
}));

vi.mock("./ai-transport", () => ({
  createAITransport: createAITransportMock,
}));

describe("createOpenAIAIService", () => {
  it("routes image generation through the shared AI transport", async () => {
    const directGenerateImageMock = vi
      .fn()
      .mockResolvedValue({ url: "data:image/jpeg;base64,transported" });
    createAITransportMock.mockImplementation(({ directGenerateImage }) => {
      directGenerateImageMock.mockImplementation(directGenerateImage);
      return {
        generateImage: vi
          .fn()
          .mockResolvedValue({ url: "data:image/jpeg;base64,transported" }),
      };
    });

    const result = await createOpenAIAIService().generateImage({
      model: "gpt-image-1",
      prompt: "  premium dessert \n with berries ",
      provider: "openai",
      size: "1024x1024",
    });

    expect(result).toEqual({ url: "data:image/jpeg;base64,transported" });
    expect(createAITransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        directGenerateImage: expect.any(Function),
      }),
    );
    expect(directGenerateImageMock).not.toHaveBeenCalled();
  });

  it("uses the OpenAI image edits API when a source image URL is provided", async () => {
    createAITransportMock.mockImplementation(({ directGenerateImage }) => ({
      generateImage: directGenerateImage,
    }));
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
    createAITransportMock.mockImplementation(({ directGenerateImage }) => ({
      generateImage: directGenerateImage,
    }));
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

  it("routes OpenRouter text/object calls through the internal EU proxy when configured", async () => {
    createAITransportMock.mockImplementation(({ directGenerateImage }) => ({
      generateImage: directGenerateImage,
    }));
    generateObjectMock.mockResolvedValue({ object: { title: "Dessert" } });

    const previousEnv = { ...process.env };
    process.env.INTERNAL_AI_GATEWAY_URL =
      "http://10.10.0.2:3001/api/internal/ai";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    try {
      await createOpenAIAIService().generateObject({
        model: "openai/gpt-4o-mini",
        prompt: "Analyze this dessert.",
        provider: "openrouter",
        schema: z.object({ title: z.string() }),
        system: "You are a pastry chef.",
        temperature: 0.2,
      });
    } finally {
      process.env = previousEnv;
    }

    expect(createOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "internal-openrouter-proxy",
        baseURL: "http://10.10.0.2:3001/api/internal/openrouter",
        headers: {
          "x-internal-shared-secret": "shared-secret",
        },
        name: "openrouter-proxy",
      }),
    );
  });

  it("passes the previous direct image logic into the shared transport", async () => {
    createAITransportMock.mockImplementation(({ directGenerateImage }) => ({
      generateImage: directGenerateImage,
    }));
    generateImageMock.mockResolvedValue({
      images: [{ base64: "abc", mediaType: "image/png" }],
    });

    const result = await createOpenAIAIService().generateImage({
      model: "gpt-image-1",
      prompt: "premium dessert",
      provider: "openai",
      size: "1024x1024",
    });

    expect(result).toEqual({ url: "data:image/png;base64,abc" });
    expect(generateImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "premium dessert",
      }),
    );
  });

  it("exports the direct image helper for internal gateway callers", async () => {
    createAITransportMock.mockClear();
    generateImageMock.mockResolvedValue({
      images: [{ base64: "direct", mediaType: "image/png" }],
    });

    const result = await generateOpenAIImageDirect({
      model: "gpt-image-1",
      prompt: "premium dessert",
      provider: "openai",
      size: "1024x1024",
    });

    expect(result).toEqual({ url: "data:image/png;base64,direct" });
    expect(createAITransportMock).not.toHaveBeenCalled();
    expect(generateImageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "premium dessert",
      }),
    );
  });
});
