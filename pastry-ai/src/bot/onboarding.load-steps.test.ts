import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("loadOnboardingSteps", () => {
  it("excludes the expired tariff step from the regular onboarding flow", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        buyButtons: [],
        buyButtonText: "",
        buyButtonUrl: null,
        imagePath: "/onboarding/1.jpg",
        nextAction: "next",
        nextButtonText: "Далее",
        offerButtonText: null,
        slug: "welcome",
        text: "welcome",
        title: "Welcome",
      },
      {
        buyButtons: [],
        buyButtonText: "",
        buyButtonUrl: null,
        imagePath: "/onboarding/maria.png",
        nextAction: "activate_promo_and_next",
        nextButtonText: "Начать бесплатно",
        offerButtonText: null,
        slug: "maria",
        text: "maria",
        title: "Maria",
      },
    ]);

    vi.doMock("@/db/prisma", () => ({
      prisma: {
        funnelStep: {
          findMany,
        },
      },
    }));

    const { loadOnboardingSteps } = await import("./onboarding");
    const steps = await loadOnboardingSteps();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        slug: { not: "expired-tariff" },
      },
      orderBy: { sortOrder: "asc" },
      select: {
        buyButtons: true,
        buyButtonText: true,
        buyButtonUrl: true,
        imagePath: true,
        nextButtonText: true,
        nextAction: true,
        offerButtonText: true,
        text: true,
        title: true,
      },
    });
    expect(steps).toHaveLength(2);
    expect(steps.map((step) => step.title)).toEqual(["Welcome", "Maria"]);
  });
});
