import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tariffPlan: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

import AdminTariffsPage from "./page";

describe("AdminTariffsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("renders tariffs from the local admin source by default", async () => {
    prismaMock.tariffPlan.findMany.mockResolvedValue([
      {
        active: true,
        createdAt: new Date("2026-07-15T10:00:00.000Z"),
        durationDays: 30,
        id: "tariff_1",
        name: "Базовый",
        slug: "basic",
        sortOrder: 1,
        tokenAmount: 1000,
      },
    ]);

    const html = renderToStaticMarkup(await AdminTariffsPage());

    expect(html).toContain("Тарифы");
    expect(html).toContain("Базовый");
    expect(html).toContain("1000");
  });

  it("reads tariffs from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          tariffs: [
            {
              active: true,
              createdAt: new Date("2026-07-15T10:00:00.000Z").toISOString(),
              durationDays: 30,
              id: "tariff_1",
              name: "Базовый",
              slug: "basic",
              sortOrder: 1,
              tokenAmount: 1000,
              updatedAt: new Date("2026-07-15T10:00:00.000Z").toISOString(),
            },
          ],
        }),
      }),
    );

    const html = renderToStaticMarkup(await AdminTariffsPage());

    expect(html).toContain("Базовый");
    expect(prismaMock.tariffPlan.findMany).not.toHaveBeenCalled();
  });
});
