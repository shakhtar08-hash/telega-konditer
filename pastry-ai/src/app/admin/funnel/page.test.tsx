import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFunnelPage, { dynamic } from "./page";

const { loadAdminFunnelPageDataMock } = vi.hoisted(() => ({
  loadAdminFunnelPageDataMock: vi.fn(),
}));

vi.mock("@/features/admin/funnel/service", () => ({
  loadAdminFunnelPageData: loadAdminFunnelPageDataMock,
  performCreateFunnelStep: vi.fn(),
  performUpdateFunnelStep: vi.fn(),
}));

function expectNoMojibake(text: string) {
  for (const marker of ["\u0420\u045f", "\u0420\u045c", "\u0420\u040e", "\u0420\u2019"]) {
    expect(text).not.toContain(marker);
  }
}

describe("AdminFunnelPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("renders funnel steps and controls for creating new posts", async () => {
    loadAdminFunnelPageDataMock.mockResolvedValue({
      steps: [
        {
          active: true,
          buyButtons: [],
          buyButtonText: "",
          buyButtonUrl: null,
          nextAction: "activate_promo_and_next",
          id: "step_1",
          imagePath: "/onboarding/1.jpg",
          nextButtonText: "Далее",
          offerButtonText: null,
          slug: "welcome",
          sortOrder: 0,
          text: "Текст шага",
          title: "Приветствие",
        },
      ],
    });

    const html = renderToStaticMarkup(await AdminFunnelPage());

    expect(dynamic).toBe("force-dynamic");
    expect(loadAdminFunnelPageDataMock).toHaveBeenCalled();
    expect(html).toContain("Приветствие");
    expect(html).toContain("/onboarding/1.jpg");
    expect(html).toContain("Текст шага");
    expect(html).toContain("Оплатные кнопки");
    expect(html).toContain("Создать новый шаг");
    expect(html).toContain("Действие при нажатии");
    expect(html).toContain('name="nextAction" value="activate_promo_and_next"');
    expect(html).toContain('option value="activate_promo_and_next" selected=""');
    expect(html).toContain("bg-[#121a27]");
    expectNoMojibake(html);
  });

  it("loads funnel steps from the internal bridge on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    loadAdminFunnelPageDataMock.mockResolvedValue({ steps: [] });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        steps: [
          {
            id: "step_1",
            slug: "welcome",
            title: "РџСЂРёРІРµС‚СЃС‚РІРёРµ",
            text: "РўРµРєСЃС‚ С€Р°РіР°",
            imagePath: "/onboarding/1.jpg",
            sortOrder: 0,
            active: true,
            nextButtonText: "Далее",
            nextAction: "next",
            offerButtonText: null,
            buyButtons: [],
            buyButtonText: "",
            buyButtonUrl: null,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const html = renderToStaticMarkup(await AdminFunnelPage());

    expect(loadAdminFunnelPageDataMock).not.toHaveBeenCalled();
    expect(html).toContain("РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("fails closed on ingress when the bridge is not configured", async () => {
    process.env.APP_ROLE = "ingress";
    loadAdminFunnelPageDataMock.mockResolvedValue({ steps: [] });

    await expect(AdminFunnelPage()).rejects.toThrow(
      "Internal admin bridge is not configured",
    );
    expect(loadAdminFunnelPageDataMock).not.toHaveBeenCalled();
  });
});
