import { describe, expect, it, vi } from "vitest";
import { syncFunnelSteps } from "../../../prisma/sync-funnel-steps.mjs";

describe("syncFunnelSteps", () => {
  it("upserts each funnel step by slug so existing records stay in sync", async () => {
    const model = {
      upsert: vi.fn(),
    };

    await syncFunnelSteps(model as never, [
      {
        imagePath: "/onboarding/1.jpg",
        slug: "welcome",
        text: "Welcome",
      },
      {
        imagePath: "/onboarding/offer.png",
        slug: "offer",
        text: "Offer",
      },
    ]);

    expect(model.upsert).toHaveBeenCalledTimes(2);
    expect(model.upsert).toHaveBeenNthCalledWith(1, {
      create: {
        imagePath: "/onboarding/1.jpg",
        slug: "welcome",
        text: "Welcome",
      },
      update: {
        imagePath: "/onboarding/1.jpg",
        text: "Welcome",
      },
      where: { slug: "welcome" },
    });
    expect(model.upsert).toHaveBeenNthCalledWith(2, {
      create: {
        imagePath: "/onboarding/offer.png",
        slug: "offer",
        text: "Offer",
      },
      update: {
        imagePath: "/onboarding/offer.png",
        text: "Offer",
      },
      where: { slug: "offer" },
    });
  });
});
