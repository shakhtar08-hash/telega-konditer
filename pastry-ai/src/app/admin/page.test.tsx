import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AdminDashboardPage, { dynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    conversation: { findMany: vi.fn() },
    generatedRecipeContext: { count: vi.fn() },
    payment: { aggregate: vi.fn() },
    photoStyle: { findMany: vi.fn() },
    subscription: { count: vi.fn() },
    tokenUsage: { aggregate: vi.fn() },
    usage: { aggregate: vi.fn(), groupBy: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.subscription.count.mockResolvedValue(0);
    prismaMock.usage.aggregate.mockResolvedValue({ _sum: { cost: 0 } });
    prismaMock.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    prismaMock.generatedRecipeContext.count.mockResolvedValue(0);
    prismaMock.tokenUsage.aggregate.mockResolvedValue({ _sum: { imagesSent: 0 } });
    prismaMock.usage.groupBy.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.conversation.findMany.mockResolvedValue([]);
    prismaMock.photoStyle.findMany.mockResolvedValue([]);
  });

  it("renders dashboard basics", async () => {
    const html = renderToStaticMarkup(await AdminDashboardPage());

    expect(dynamic).toBe("force-dynamic");
    expect(html).toContain("Пользователи");
  });

  it("loads dashboard metrics from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          apiCost: 1234,
          conversations: [],
          conversion: 25,
          distribution: {
            analysis: 0,
            consulting: 0,
            content: 0,
            other: 0,
            photo: 0,
            recipes: 0,
          },
          metricCards: [
            {
              accent: "bg-[#7257ff]",
              label: "РџРѕР»СЊР·РѕРІР°С‚РµР»Рё",
              value: "42",
            },
          ],
          photoStyles: [],
          providerUsage: [],
          recipeCount: 0,
          revenue: 0,
          users: [],
        }),
        ok: true,
      }),
    );

    const html = renderToStaticMarkup(await AdminDashboardPage());

    expect(html).toContain("42");
  });
});
