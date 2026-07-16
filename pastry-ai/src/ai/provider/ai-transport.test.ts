import { describe, expect, it, vi } from "vitest";
import { createAITransport } from "./ai-transport";

describe("createAITransport", () => {
  it("sanitizes prompts before direct KIE image generation", async () => {
    const directImage = vi
      .fn()
      .mockResolvedValue({ url: "data:image/jpeg;base64,abc" });
    const transport = createAITransport({
      directGenerateImage: directImage,
      gatewayUrl: undefined,
      sharedSecret: undefined,
    });

    await transport.generateImage({
      provider: "kie",
      model: "flux-kontext-pro",
      prompt: "  premium   dessert \n with berries ",
    });

    expect(directImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "premium dessert with berries",
      }),
    );
  });

  it("posts sanitized prompts to the internal AI gateway when configured", async () => {
    const directImage = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ url: "https://gateway.example/generated.jpg" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const transport = createAITransport({
      directGenerateImage: directImage,
      gatewayUrl: "https://gateway.example/internal/ai",
      sharedSecret: "shared-secret",
    });

    const result = await transport.generateImage({
      provider: "openai",
      model: "gpt-image-1",
      prompt: "  plated  dessert \n\n with cream ",
      size: "1024x1024",
    });

    expect(result).toEqual({ url: "https://gateway.example/generated.jpg" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gateway.example/internal/ai",
      expect.objectContaining({
        body: JSON.stringify({
          provider: "openai",
          model: "gpt-image-1",
          prompt: "plated dessert with cream",
          size: "1024x1024",
        }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "shared-secret",
        },
        method: "POST",
      }),
    );
    expect(directImage).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
