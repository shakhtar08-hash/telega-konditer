import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CarouselTemplatesPage, {
  dynamic as carouselDynamic,
} from "./carousel-templates/page";
import HistoryPage, { dynamic as historyDynamic } from "./history/page";
import PhotoStylesPage, {
  dynamic as photoStylesDynamic,
} from "./photo-styles/page";
import SettingsPage, { dynamic as settingsDynamic } from "./settings/page";
import UsagePage, { dynamic as usageDynamic } from "./usage/page";
import UsersPage, { dynamic as usersDynamic } from "./users/page";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findMany: vi.fn(),
    },
    photoStyle: {
      findMany: vi.fn(),
    },
    carouselTemplate: {
      findMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
    },
    usage: {
      findMany: vi.fn(),
    },
    apiSecret: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("admin data pages", () => {
  it("renders users from the database", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        telegramId: "123",
        username: "chef",
        name: "Chef One",
        plan: "PRO",
        credits: 42,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);

    const text = renderToStaticMarkup(await UsersPage());

    expect(usersDynamic).toBe("force-dynamic");
    expect(prismaMock.user.findMany).toHaveBeenCalled();
    expect(text).toContain("chef");
    expect(text).toContain("PRO");
    expect(text).toContain("42");
  });

  it("renders photo styles from the database", async () => {
    prismaMock.photoStyle.findMany.mockResolvedValue([
      {
        id: "style_1",
        name: "Editorial pastry",
        description: "Bright magazine lighting",
        active: true,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);

    const text = renderToStaticMarkup(await PhotoStylesPage());

    expect(photoStylesDynamic).toBe("force-dynamic");
    expect(prismaMock.photoStyle.findMany).toHaveBeenCalled();
    expect(text).toContain("Editorial pastry");
    expect(text).toContain("Bright magazine lighting");
  });

  it("renders carousel templates from the database", async () => {
    prismaMock.carouselTemplate.findMany.mockResolvedValue([
      {
        id: "template_1",
        name: "Recipe lesson",
        slides: 6,
        active: true,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);

    const text = renderToStaticMarkup(await CarouselTemplatesPage());

    expect(carouselDynamic).toBe("force-dynamic");
    expect(prismaMock.carouselTemplate.findMany).toHaveBeenCalled();
    expect(text).toContain("Recipe lesson");
    expect(text).toContain("6");
  });

  it("renders conversation history from the database", async () => {
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        id: "conversation_1",
        feature: "recipes",
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
        user: { username: "chef", telegramId: "123" },
        messages: [
          {
            role: "USER",
            content: "Make a lemon tart",
            model: null,
            createdAt: new Date("2026-06-28T00:00:00.000Z"),
          },
        ],
      },
    ]);

    const text = renderToStaticMarkup(await HistoryPage());

    expect(historyDynamic).toBe("force-dynamic");
    expect(prismaMock.conversation.findMany).toHaveBeenCalled();
    expect(text).toContain("recipes");
    expect(text).toContain("Make a lemon tart");
  });

  it("renders usage rows from the database", async () => {
    prismaMock.usage.findMany.mockResolvedValue([
      {
        id: "usage_1",
        feature: "vision",
        inputTokens: 100,
        outputTokens: 40,
        cost: { toString: () => "0.12" },
        latency: 900,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
        user: { username: "chef", telegramId: "123" },
      },
    ]);

    const text = renderToStaticMarkup(await UsagePage());

    expect(usageDynamic).toBe("force-dynamic");
    expect(prismaMock.usage.findMany).toHaveBeenCalled();
    expect(text).toContain("vision");
    expect(text).toContain("$0.12");
  });

  it("renders settings without secret values", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    prismaMock.apiSecret.findMany.mockResolvedValue([
      {
        key: "OPENROUTER_API_KEY",
        valuePreview: "sk-or...abcd",
        updatedAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);
    const previousEnv = process.env;
    vi.stubGlobal("process", {
      ...process,
      env: {
        ...previousEnv,
        OPENAI_API_KEY: "secret-openai",
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "secret-password",
        ADMIN_SESSION_SECRET: "secret-session",
      },
    });

    const text = renderToStaticMarkup(await SettingsPage());

    expect(settingsDynamic).toBe("force-dynamic");
    expect(text).toContain("OPENAI_API_KEY");
    expect(text).toContain("OPENROUTER_API_KEY");
    expect(text).toContain("sk-or...abcd");
    expect(text).toContain("Set");
    expect(text).not.toContain("secret-openai");
    expect(text).not.toContain("secret-password");

    vi.unstubAllGlobals();
  });
});
