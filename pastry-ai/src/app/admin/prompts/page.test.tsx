import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminPromptsPage, { dynamic } from "./page";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    prompt: {
      findMany,
    },
  },
}));

function expectNoMojibake(text: string) {
  for (const marker of ["\u0420\u045f", "\u0420\u045c", "\u0420\u040e", "\u0420\u2019"]) {
    expect(text).not.toContain(marker);
  }
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectText(node.props.children);
  }

  return "";
}

describe("AdminPromptsPage", () => {
  it("renders fresh database data on each request", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders prompts as dark Russian editor cards", async () => {
    findMany.mockResolvedValue([
      {
        id: "prompt_1",
        title: "\u0420\u0435\u0446\u0435\u043f\u0442 \u043f\u043e \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u0430\u043c",
        slug: "recipe-from-ingredients",
        feature: "recipes",
        provider: "openrouter",
        systemPrompt: "System prompt",
        userTemplate: "User template",
        model: "gpt-4o-mini",
        temperature: 0.3,
        active: true,
        version: 1,
        createdAt: new Date("2026-06-28T00:00:00.000Z"),
        updatedAt: new Date("2026-06-28T00:00:00.000Z"),
      },
    ]);

    const page = await AdminPromptsPage();
    const text = collectText(page);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ feature: "asc" }, { slug: "asc" }, { version: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        feature: true,
        provider: true,
        systemPrompt: true,
        userTemplate: true,
        model: true,
        temperature: true,
        active: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(text).toContain("recipe-from-ingredients");
    expect(text).toContain("recipes");
    expect(text).toContain("openrouter");
    expect(text).toContain("gpt-4o-mini");

    const html = renderToStaticMarkup(page);
    expect(html).toContain("\u041f\u0440\u043e\u043c\u0442\u044b");
    expect(html).toContain("\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043d\u043e\u043f\u043a\u0438");
    expect(html).toContain("\u0420\u0435\u0446\u0435\u043f\u0442 \u043f\u043e \u0438\u043d\u0433\u0440\u0435\u0434\u0438\u0435\u043d\u0442\u0430\u043c");
    expect(html).toContain("\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0432 \u043c\u0435\u043d\u044e \u0431\u043e\u0442\u0430");
    expect(html).toContain("bg-[#121a27]");
    expectNoMojibake(html);
  });
});
