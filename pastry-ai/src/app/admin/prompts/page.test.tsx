import { isValidElement, type ReactNode } from "react";
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

  it("renders prompts from the database", async () => {
    findMany.mockResolvedValue([
      {
        id: "prompt_1",
        slug: "recipe-from-ingredients",
        feature: "recipes",
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
        slug: true,
        feature: true,
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
    expect(text).toContain("gpt-4o-mini");
  });
});
