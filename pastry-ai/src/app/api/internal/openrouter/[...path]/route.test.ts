import { beforeEach, describe, expect, it, vi } from "vitest";

const loadEnvMock = vi.hoisted(() =>
  vi.fn(() => ({
    INTERNAL_API_SHARED_SECRET: "internal-secret",
  })),
);
const isValidInternalServiceRequestMock = vi.hoisted(() => vi.fn(() => true));
const resolveManagedApiKeyMock = vi.hoisted(() =>
  vi.fn(async () => "openrouter-live-key"),
);

vi.mock("@/lib/env", () => ({
  loadEnv: loadEnvMock,
}));

vi.mock("@/lib/internal-service-auth", () => ({
  isValidInternalServiceRequest: isValidInternalServiceRequestMock,
}));

vi.mock("@/lib/api-secrets", () => ({
  resolveManagedApiKey: resolveManagedApiKeyMock,
}));

import { POST } from "./route";

describe("POST /api/internal/openrouter/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadEnvMock.mockReturnValue({
      INTERNAL_API_SHARED_SECRET: "internal-secret",
    });
    isValidInternalServiceRequestMock.mockReturnValue(true);
    resolveManagedApiKeyMock.mockResolvedValue("openrouter-live-key");
  });

  it("rejects unauthenticated requests", async () => {
    isValidInternalServiceRequestMock.mockReturnValue(false);

    const response = await POST(
      new Request("https://example.com/api/internal/openrouter/responses", {
        body: JSON.stringify({ model: "openai/gpt-4o-mini", input: "ok" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ path: ["responses"] }) },
    );

    expect(response.status).toBe(401);
    expect(resolveManagedApiKeyMock).not.toHaveBeenCalled();
  });

  it("forwards the raw request to OpenRouter with the managed API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"id":"resp_123"}', {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.com/api/internal/openrouter/responses", {
        body: JSON.stringify({
          input: "Return exactly: ok",
          model: "openai/gpt-4o-mini",
        }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "internal-secret",
        },
        method: "POST",
      }),
      { params: Promise.resolve({ path: ["responses"] }) },
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('{"id":"resp_123"}');
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/responses",
      {
        body: JSON.stringify({
          input: "Return exactly: ok",
          model: "openai/gpt-4o-mini",
        }),
        headers: {
          Authorization: "Bearer openrouter-live-key",
          "content-type": "application/json",
        },
        method: "POST",
      },
    );

    vi.unstubAllGlobals();
  });
});
