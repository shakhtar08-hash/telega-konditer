import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminSettingsPage, { dynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    apiSecret: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("shows transition runtime keys for internal RU/EU deployment", async () => {
    prismaMock.apiSecret.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const text = renderToStaticMarkup(await AdminSettingsPage());

    expect(dynamic).toBe("force-dynamic");
    expect(text).toContain("INTERNAL_API_BASE_URL");
    expect(text).toContain("INTERNAL_AI_GATEWAY_URL");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("loads stored secrets from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    prismaMock.apiSecret.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          dbStatus: "ok",
          runtimeEnv: [],
          storedSecrets: [
            {
              key: "OPENAI_API_KEY",
              updatedAt: "2026-07-17T10:00:00.000Z",
              valuePreview: "sk-...1234",
            },
          ],
        }),
        ok: true,
      }),
    );

    const html = renderToStaticMarkup(await AdminSettingsPage());

    expect(html).toContain("sk-...1234");
  });

  it("does not fall back to local env previews on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    process.env.OPENAI_API_KEY = "sk-local-should-not-appear";
    prismaMock.apiSecret.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          dbStatus: "ok",
          runtimeEnv: [],
          storedSecrets: [],
        }),
        ok: true,
      }),
    );

    const html = renderToStaticMarkup(await AdminSettingsPage());

    expect(html).not.toContain("Окружение");
    expect(html).not.toContain("sk-l");
    delete process.env.OPENAI_API_KEY;
  });
});
