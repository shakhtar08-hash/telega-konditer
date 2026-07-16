import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminChatBotPage, { dynamic as chatBotDynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    botMenuButton: {
      findMany: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
    },
    botTextBlock: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

function expectNoMojibake(text: string) {
  for (const marker of ["Рџ", "Рќ", "РЎ", "вЂ"]) {
    expect(text).not.toContain(marker);
  }
}

describe("AdminChatBotPage", () => {
  it("renders editable menu buttons and a Telegram preview", async () => {
    prismaMock.botMenuButton.findMany.mockResolvedValue([
      {
        actionType: "PROMPT",
        active: true,
        description: "Создание рецептов по ингредиентам",
        emoji: "🍰",
        fullWidth: false,
        id: "button_recipe",
        instructionText: null,
        label: "Создать рецепт",
        previewImageUrl: null,
        processingText: null,
        promptFeature: "recipes",
        promptSlug: "recipe-from-ingredients",
        sortOrder: 1,
        url: null,
      },
      {
        actionType: "URL",
        active: true,
        description: "Акции и подарки",
        emoji: "🎁",
        fullWidth: false,
        id: "button_bonus",
        instructionText: null,
        label: "Бонусы и акции",
        previewImageUrl: null,
        processingText: null,
        promptFeature: null,
        promptSlug: null,
        sortOrder: 2,
        url: "https://example.com/bonus",
      },
    ]);
    prismaMock.botTextBlock.findUnique.mockResolvedValue(null);
    prismaMock.prompt.findMany.mockResolvedValue([
      {
        feature: "recipes",
        slug: "recipe-from-ingredients",
        title: "Рецепт по ингредиентам",
      },
    ]);

    const text = renderToStaticMarkup(await AdminChatBotPage());

    expect(chatBotDynamic).toBe("force-dynamic");
    expect(prismaMock.botMenuButton.findMany).toHaveBeenCalled();
    expect(prismaMock.prompt.findMany).toHaveBeenCalled();
    expect(text).toContain("Чат-бот");
    expect(text).toContain("Меню бота");
    expect(text).toContain("Создать рецепт");
    expect(text).toContain("Бонусы и акции");
    expect(text).toContain("Предпросмотр меню");
    expect(text).toContain("Рецепт по ингредиентам");
    expectNoMojibake(text);
  });

  it("deduplicates prompt targets when multiple active versions share the same feature and slug", async () => {
    prismaMock.botMenuButton.findMany.mockResolvedValue([]);
    prismaMock.botTextBlock.findUnique.mockResolvedValue(null);
    prismaMock.prompt.findMany.mockResolvedValue([
      {
        feature: "recipe-card",
        slug: "recipe-card",
        title: "Карточка рецепта v3",
      },
      {
        feature: "recipe-card",
        slug: "recipe-card",
        title: "Карточка рецепта v2",
      },
    ]);

    const text = renderToStaticMarkup(await AdminChatBotPage());

    expect(text.match(/value="recipe-card::recipe-card"/g)?.length).toBe(1);
  });
});
