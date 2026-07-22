import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminChatBotPage, { dynamic as chatBotDynamic } from "./page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    botMenuButton: {
      findMany: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
    },
    scenario: {
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
  for (const marker of ["\u0420\u045f", "\u0420\u045c", "\u0420\u040e", "\u0420\u2019"]) {
    expect(text).not.toContain(marker);
  }
}

describe("AdminChatBotPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("renders editable menu buttons, scenarios, and a Telegram preview", async () => {
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
        scenarioId: null,
        scenario: null,
        sortOrder: 1,
        url: null,
      },
      {
        actionType: "SCENARIO",
        active: true,
        description: "Welcome flow",
        emoji: "🎬",
        fullWidth: false,
        id: "button_scenario",
        instructionText: null,
        label: "Сценарий приветствия",
        previewImageUrl: null,
        processingText: null,
        promptFeature: null,
        promptSlug: null,
        scenarioId: "scenario_1",
        scenario: { name: "Welcome flow" },
        sortOrder: 2,
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
        scenarioId: null,
        scenario: null,
        sortOrder: 3,
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
    prismaMock.scenario.findMany.mockResolvedValue([
      { id: "scenario_1", name: "Welcome flow" },
    ]);

    const text = renderToStaticMarkup(await AdminChatBotPage());

    expect(chatBotDynamic).toBe("force-dynamic");
    expect(prismaMock.botMenuButton.findMany).toHaveBeenCalled();
    expect(prismaMock.prompt.findMany).toHaveBeenCalled();
    expect(prismaMock.scenario.findMany).toHaveBeenCalled();
    expect(text).toContain("Чат-бот");
    expect(text).toContain("Меню бота");
    expect(text).toContain("Создать рецепт");
    expect(text).toContain("Сценарий приветствия");
    expect(text).toContain("Welcome flow");
    expect(text).toContain("Бонусы и акции");
    expect(text).toContain("Предпросмотр меню");
    expect(text).toContain("Рецепт по ингредиентам");
    expect(text).toContain("Запустить сценарий");
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
    prismaMock.scenario.findMany.mockResolvedValue([]);

    const text = renderToStaticMarkup(await AdminChatBotPage());

    expect(text.match(/value="recipe-card::recipe-card"/g)?.length).toBe(1);
  });

  it("reads chat-bot page data from RU when running as ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          buttons: [
            {
              actionType: "PROMPT",
              active: true,
              description: "desc",
              emoji: "🍰",
              fullWidth: false,
              id: "button_1",
              instructionText: null,
              label: "RU Button",
              previewImageUrl: null,
              processingText: null,
              promptFeature: "recipes",
              promptSlug: "recipe-from-ingredients",
              scenarioId: null,
              scenarioName: null,
              sortOrder: 1,
              url: null,
            },
          ],
          prompts: [
            {
              feature: "recipes",
              slug: "recipe-from-ingredients",
              title: "Recipe",
            },
          ],
          scenarios: [
            {
              id: "scenario_1",
              name: "Welcome flow",
            },
          ],
          menuIntro: {
            text: "Выберите рецепт",
          },
        }),
      }),
    );

    const html = renderToStaticMarkup(await AdminChatBotPage());

    expect(html).toContain("RU Button");
    expect(prismaMock.botMenuButton.findMany).not.toHaveBeenCalled();
    expect(prismaMock.prompt.findMany).not.toHaveBeenCalled();
    expect(prismaMock.scenario.findMany).not.toHaveBeenCalled();
    expect(prismaMock.botTextBlock.findUnique).not.toHaveBeenCalled();
  });
});
