import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DashboardPage, { dynamic as dashboardDynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    prompt: {
      count: vi.fn(),
    },
    photoStyle: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    conversation: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    usage: {
      aggregate: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("admin dashboard", () => {
  it("renders the redesigned dashboard with live summary data", async () => {
    prismaMock.user.count.mockResolvedValue(1243);
    prismaMock.prompt.count.mockResolvedValue(12);
    prismaMock.photoStyle.count.mockResolvedValue(8);
    prismaMock.conversation.count.mockResolvedValue(2817);
    prismaMock.subscription.count.mockResolvedValue(187);
    prismaMock.usage.aggregate.mockResolvedValue({
      _sum: { cost: { toString: () => "18.23" } },
    });
    prismaMock.payment.aggregate.mockResolvedValue({
      _sum: { amount: { toString: () => "74560" } },
    });
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        telegramId: "123",
        username: "anna_cake",
        name: "Анна Петрова",
        plan: "PRO",
        credits: 120,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        id: "conversation_1",
        feature: "recipe",
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
        user: {
          telegramId: "123",
          username: "anna_cake",
          name: "Анна Петрова",
        },
        messages: [{ content: "Подскажи рецепт муссового торта" }],
      },
    ]);
    prismaMock.photoStyle.findMany.mockResolvedValue([
      { id: "style_1", name: "Темный премиум", preview: null },
    ]);

    const text = renderToStaticMarkup(await DashboardPage()).replaceAll(
      "\u00a0",
      " ",
    );

    expect(dashboardDynamic).toBe("force-dynamic");
    expect(prismaMock.user.count).toHaveBeenCalled();
    expect(text).toContain("Дашборд");
    expect(text).toContain("Пользователи");
    expect(text).toContain("1 243");
    expect(text).toContain("74 560 ₽");
    expect(text).toContain("Последние диалоги");
    expect(text).toContain("Анна Петрова");
    expect(text).toContain("Темный премиум");
  });
});
