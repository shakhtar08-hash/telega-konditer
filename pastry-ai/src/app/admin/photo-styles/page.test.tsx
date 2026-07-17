import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PhotoStylesPage, { dynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    photoStyle: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

function expectNoMojibake(text: string) {
  for (const marker of ["Р Сџ", "Р Сњ", "Р РЋ", "РІР‚"]) {
    expect(text).not.toContain(marker);
  }
}

describe("PhotoStylesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("renders local photo styles for admin editing", async () => {
    prismaMock.photoStyle.findMany.mockResolvedValue([
      {
        id: "style_1",
        name: "Editorial pastry",
        description: "Bright magazine lighting",
        prompt: "Prompt text",
        preview: null,
        userPreview: null,
        userText: null,
        provider: "openai",
        model: "gpt-image-1",
        active: true,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);

    const text = renderToStaticMarkup(await PhotoStylesPage());

    expect(dynamic).toBe("force-dynamic");
    expect(prismaMock.photoStyle.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(text).toContain("Фото-стили");
    expect(text).toContain("Editorial pastry");
    expect(text).toContain("Bright magazine lighting");
    expectNoMojibake(text);
  });

  it("reads photo styles from RU when running as ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          styles: [
            {
              id: "style_1",
              name: "Soft Box",
              description: "desc",
              prompt: "prompt",
              preview: null,
              userPreview: null,
              userText: null,
              provider: "openai",
              model: "gpt-image-1",
              active: true,
              createdAt: new Date("2026-06-28T00:00:00.000Z").toISOString(),
            },
          ],
        }),
      }),
    );

    const html = renderToStaticMarkup(await PhotoStylesPage());

    expect(html).toContain("Soft Box");
    expect(prismaMock.photoStyle.findMany).not.toHaveBeenCalled();
  });
});
