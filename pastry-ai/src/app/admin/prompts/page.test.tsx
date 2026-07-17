import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPromptsPage, { dynamic, updatePrompt } from "./page";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

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

  it("reads prompts from RU when running as ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prompts: [
            {
              id: "prompt_1",
              title: "Recipe",
              slug: "recipe",
              feature: "recipe-card",
              provider: "openai",
              systemPrompt: "sys",
              userTemplate: "user",
              model: "gpt-4.1",
              temperature: 0.4,
              active: true,
              version: 1,
              createdAt: new Date("2026-06-28T00:00:00.000Z").toISOString(),
              updatedAt: new Date("2026-06-28T00:00:00.000Z").toISOString(),
            },
          ],
        }),
      }),
    );

    const html = renderToStaticMarkup(await AdminPromptsPage());

    expect(html).toContain("Recipe");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("posts prompt updates to RU when running as ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("id", "prompt_1");
    formData.set("title", "Recipe");
    formData.set("slug", "recipe");
    formData.set("feature", "recipe-card");
    formData.set("systemPrompt", "sys");
    formData.set("userTemplate", "user");
    formData.set("model", "gpt-4.1");
    formData.set("temperature", "0.4");
    formData.set("provider", "openai");
    formData.set("active", "on");

    await updatePrompt(formData);

    expect(fetchMock).toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });
});
