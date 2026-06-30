import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminFunnelPage, { dynamic } from "./page";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    funnelStep: {
      findMany,
    },
  },
}));

describe("AdminFunnelPage", () => {
  it("renders funnel steps and controls for creating new posts", async () => {
    findMany.mockResolvedValue([
      {
        active: true,
        buyButtonText: "Купить",
        buyButtonUrl: null,
        id: "step_1",
        imagePath: "/onboarding/welcome.png",
        nextButtonText: "Далее",
        offerButtonText: null,
        slug: "welcome",
        sortOrder: 0,
        text: "Текст шага",
        title: "Приветствие",
      },
    ]);

    const html = renderToStaticMarkup(await AdminFunnelPage());

    expect(dynamic).toBe("force-dynamic");
    expect(findMany).toHaveBeenCalled();
    expect(html).toContain("Приветствие");
    expect(html).toContain("/onboarding/welcome.png");
    expect(html).toContain("Текст шага");
    expect(html).toContain("Свой URL покупки");
    expect(html).toContain("Создать новый шаг");
  });
});
