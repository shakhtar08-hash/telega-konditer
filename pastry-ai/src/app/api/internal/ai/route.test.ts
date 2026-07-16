import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEnvMock = vi.hoisted(() =>
  vi.fn(() => ({
    INTERNAL_API_SHARED_SECRET: "internal-secret",
  })),
);
const isValidInternalServiceRequestMock = vi.hoisted(() => vi.fn(() => true));
const generateImageDirectMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ url: "data:image/png;base64,gateway" })),
);

vi.mock("@/lib/env", () => ({
  loadEnv: loadEnvMock,
}));

vi.mock("@/lib/internal-service-auth", () => ({
  isValidInternalServiceRequest: isValidInternalServiceRequestMock,
}));

vi.mock("@/ai/provider/openai-provider", () => ({
  generateOpenAIImageDirect: generateImageDirectMock,
}));

import { POST } from "./route";

describe("POST /api/internal/ai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadEnvMock.mockReturnValue({
      INTERNAL_API_SHARED_SECRET: "internal-secret",
    });
    isValidInternalServiceRequestMock.mockReturnValue(true);
    generateImageDirectMock.mockResolvedValue({
      url: "data:image/png;base64,gateway",
    });
  });

  it("rejects unauthenticated requests", async () => {
    isValidInternalServiceRequestMock.mockReturnValue(false);

    const response = await POST(
      new Request("https://example.com/api/internal/ai", {
        body: JSON.stringify({
          model: "flux-kontext-pro",
          prompt: "premium dessert",
          provider: "kie",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(generateImageDirectMock).not.toHaveBeenCalled();
  });

  it("rejects requests when the internal shared secret is not configured", async () => {
    loadEnvMock.mockReturnValue({
      INTERNAL_API_SHARED_SECRET: "",
    });

    const response = await POST(
      new Request("https://example.com/api/internal/ai", {
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: "premium dessert",
          provider: "openai",
        }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "internal-secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(generateImageDirectMock).not.toHaveBeenCalled();
  });

  it("generates the image through the direct provider helper", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/ai", {
        body: JSON.stringify({
          aspectRatio: "16:9",
          model: "flux-kontext-pro",
          prompt: "premium dessert",
          provider: "kie",
        }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "internal-secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "data:image/png;base64,gateway",
    });
    expect(generateImageDirectMock).toHaveBeenCalledWith({
      aspectRatio: "16:9",
      model: "flux-kontext-pro",
      prompt: "premium dessert",
      provider: "kie",
    });
  });
});
