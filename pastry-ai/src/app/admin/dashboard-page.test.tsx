import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DashboardPage, { dynamic as dashboardDynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    photoStyle: {
      findMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
    },
    usage: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
    generatedRecipeContext: {
      count: vi.fn(),
    },
    tokenUsage: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("admin dashboard", () => {
  it("renders with real metrics from GeneratedRecipeContext, TokenUsage, Usage", async () => {
    prismaMock.user.count.mockResolvedValue(1243);
    prismaMock.subscription.count.mockResolvedValue(187);
    prismaMock.usage.aggregate.mockResolvedValue({
      _sum: { cost: { toString: () => "18.23" } },
    });
    prismaMock.payment.aggregate.mockResolvedValue({
      _sum: { amount: { toString: () => "74560" } },
    });
    prismaMock.generatedRecipeContext.count.mockResolvedValue(514);
    prismaMock.tokenUsage.aggregate.mockResolvedValue({
      _sum: { imagesSent: 892 },
    });
    prismaMock.usage.groupBy
      .mockResolvedValueOnce([
        { feature: "recipe-from-ingredients", _count: 300 },
        { feature: "best-recipe-search", _count: 100 },
        { feature: "photoshoot", _count: 200 },
        { feature: "vision", _count: 80 },
        { feature: "ask-chef", _count: 50 },
      ])
      .mockResolvedValueOnce([
        { provider: "openrouter", _sum: { cost: 12.5 }, _count: 45 },
        { provider: "openai", _sum: { cost: 8.3 }, _count: 30 },
        { provider: "kie", _sum: { cost: 3.2 }, _count: 15 },
      ]);
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
    expect(prismaMock.generatedRecipeContext.count).toHaveBeenCalled();
    expect(prismaMock.tokenUsage.aggregate).toHaveBeenCalled();
    expect(prismaMock.usage.groupBy).toHaveBeenCalled();
    expect(text).toContain("Дашборд");
    expect(text).toContain("Пользователи");
    expect(text).toContain("1 243");
    expect(text).toContain("74 560 ₽");
    expect(text).toContain("Рецепты создано");
    expect(text).toContain("514");
    expect(text).toContain("Фото сгенерировано");
    expect(text).toContain("892");
    expect(text).toContain("Последние диалоги");
    expect(text).toContain("Анна Петрова");
    expect(text).toContain("Темный премиум");
    expect(text).toContain("OpenRouter");
    expect(text).toContain("OpenAI");
    expect(text).toContain("KIE");
    expect(text).not.toContain("+128 за неделю");
    expect(text).not.toContain("+312 за неделю");
    expect(text).not.toContain("+842 за неделю");
    expect(text).not.toContain("Nano Banana");
    expect(text).not.toContain("$23.45 / $100");
  });
});