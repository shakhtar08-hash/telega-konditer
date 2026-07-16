import { describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/user-facing-error";
import { generateFluxKontextImage } from "./kie-provider";

const resolveManagedApiKeyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-secrets", () => ({
  resolveManagedApiKey: resolveManagedApiKeyMock,
}));

describe("generateFluxKontextImage", () => {
  it("sanitizes prompts before submitting a KIE task", async () => {
    resolveManagedApiKeyMock.mockResolvedValue("kie-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { taskId: "task-1" },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: {
            resultJson: JSON.stringify({
              resultUrls: ["https://cdn.kie.ai/output/final.jpg"],
            }),
            state: "success",
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    vi.stubGlobal("fetch", fetchMock);

    await generateFluxKontextImage({
      model: "flux-kontext-pro",
      prompt: "  premium   dessert \n with berries ",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.kie.ai/api/v1/flux/kontext/generate",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).prompt,
    ).toBe("premium dessert with berries");
  });

  it("throws when the KIE API key is missing", async () => {
    resolveManagedApiKeyMock.mockResolvedValueOnce(undefined);

    await expect(
      generateFluxKontextImage({
        imageUrl: "https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl/file.jpg",
        model: "gpt-image-2",
        prompt: "Create a premium dessert photo.",
      }),
    ).rejects.toThrow("KIE_API_KEY is required");
  });

  it("converts provider internal failures into user-facing errors", async () => {
    resolveManagedApiKeyMock.mockResolvedValue("kie-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { taskId: "task-1" },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: {
            failMsg: "internal error, please try again later.",
            state: "fail",
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { taskId: "task-2" },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: {
            failMsg: "internal error, please try again later.",
            state: "fail",
          },
        }),
        ok: true,
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateFluxKontextImage({
        imageUrl: "https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl/file.jpg",
        model: "flux-kontext-pro",
        prompt: "Create a premium dessert photo.",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Не удалось создать фото десерта. Попробуйте ещё раз чуть позже.",
        name: new UserFacingError("").name,
      }),
    );
  });

  it("retries once when KIE returns a temporary internal error", async () => {
    resolveManagedApiKeyMock.mockResolvedValue("kie-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { taskId: "task-1" },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: {
            failMsg: "internal error, please try again later.",
            state: "fail",
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { taskId: "task-2" },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: {
            resultJson: JSON.stringify({
              resultUrls: ["https://cdn.kie.ai/output/final.jpg"],
            }),
            state: "success",
          },
        }),
        ok: true,
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateFluxKontextImage({
        model: "flux-kontext-pro",
        prompt: "Create a premium dessert photo.",
      }),
    ).resolves.toEqual({
      url: "https://cdn.kie.ai/output/final.jpg",
    });

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("converts KIE timeouts into user-facing errors", async () => {
    resolveManagedApiKeyMock.mockResolvedValue("kie-key");
    const waitingResponse = {
      json: async () => ({
        code: 200,
        data: {
          state: "waiting",
        },
      }),
      ok: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          code: 200,
          data: { taskId: "task-1" },
        }),
        ok: true,
      })
      .mockImplementation(async () => waitingResponse);

    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T21:55:00Z"));

    const promise = generateFluxKontextImage({
      model: "flux-kontext-pro",
      prompt: "Create a premium dessert photo.",
    });
    const rejection = expect(promise).rejects.toEqual(
      expect.objectContaining({
        message: "KIE сейчас отвечает слишком долго. Попробуйте ещё раз чуть позже.",
        name: new UserFacingError("").name,
      }),
    );

    await vi.advanceTimersByTimeAsync(301000);
    await rejection;

    vi.useRealTimers();
  }, 10000);
});
