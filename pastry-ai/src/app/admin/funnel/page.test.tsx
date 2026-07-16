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

function expectNoMojibake(text: string) {
  for (const marker of ["\u0420\u045f", "\u0420\u045c", "\u0420\u040e", "\u0420\u2019"]) {
    expect(text).not.toContain(marker);
  }
}

describe("AdminFunnelPage", () => {
  it("renders funnel steps and controls for creating new posts", async () => {
    findMany.mockResolvedValue([
      {
        active: true,
        buyButtons: [],
        buyButtonText: "",
        buyButtonUrl: null,
        nextAction: "activate_promo_and_next",
        id: "step_1",
        imagePath: "/onboarding/welcome.png",
        nextButtonText: "\u0414\u0430\u043b\u0435\u0435",
        offerButtonText: null,
        slug: "welcome",
        sortOrder: 0,
        text: "\u0422\u0435\u043a\u0441\u0442 \u0448\u0430\u0433\u0430",
        title: "\u041f\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435",
      },
    ]);

    const html = renderToStaticMarkup(await AdminFunnelPage());

    expect(dynamic).toBe("force-dynamic");
    expect(findMany).toHaveBeenCalled();
    expect(html).toContain("\u041f\u0440\u0438\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435");
    expect(html).toContain("/onboarding/welcome.png");
    expect(html).toContain("\u0422\u0435\u043a\u0441\u0442 \u0448\u0430\u0433\u0430");
    expect(html).toContain("\u041e\u043f\u043b\u0430\u0442\u043d\u044b\u0435 \u043a\u043d\u043e\u043f\u043a\u0438");
    expect(html).toContain("\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043d\u043e\u0432\u044b\u0439 \u0448\u0430\u0433");
    expect(html).toContain("\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043f\u0440\u0438 \u043d\u0430\u0436\u0430\u0442\u0438\u0438");
    expect(html).toContain('name="nextAction" value="activate_promo_and_next"');
    expect(html).toContain('option value="activate_promo_and_next" selected=""');
    expect(html).toContain("bg-[#121a27]");
    expectNoMojibake(html);
  });
});
