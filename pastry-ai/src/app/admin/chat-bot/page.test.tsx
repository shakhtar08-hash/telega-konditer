import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminChatBotPage, {
  dynamic as chatBotDynamic,
} from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    botMenuButton: {
      findMany: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

function expectNoMojibake(text: string) {
  for (const marker of ["\u0420\u045f", "\u0420\u045c", "\u0420\u040e", "\u0420\u2019"]) {
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
        id: "button_recipe",
        label: "Создать рецепт",
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
        id: "button_bonus",
        label: "Бонусы и акции",
        promptFeature: null,
        promptSlug: null,
        sortOrder: 2,
        url: "https://example.com/bonus",
      },
    ]);
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
});
