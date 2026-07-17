import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, revalidatePathMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/features/admin/funnel/service", () => ({
  loadAdminFunnelPageData: vi.fn(),
  performCreateFunnelStep: createMock,
  performUpdateFunnelStep: updateMock,
}));

import { createFunnelStep, updateFunnelStep } from "./page";

describe("funnel step actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    updateMock.mockResolvedValue(undefined);
    createMock.mockResolvedValue(undefined);
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("keeps inactive buttons when saving an existing step", async () => {
    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("active", "on");
    formData.set("title", "Приветствие");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "Текст шага");
    formData.set("nextButtonText", "Далее");
    formData.set("nextAction", "next");
    formData.set("offerButtonText", "");
    formData.set("buyButtonText[]", "Купить");
    formData.set("buyButtonUrl[]", "{{baseUrl}}/pay");
    formData.set("buyButtonActive[]", "0");
    formData.set("buyButtonSortOrder[]", "0");

    await updateFunnelStep(formData);

    expect(updateMock).toHaveBeenCalledWith({
      active: true,
      buyButtons: [
        {
          active: false,
          sortOrder: 0,
          text: "Купить",
          url: "{{baseUrl}}/pay",
        },
      ],
      firstBuyButton: undefined,
      id: "step_1",
      imagePath: "/onboarding/1.jpg",
      nextAction: "next",
      nextButtonText: "Далее",
      offerButtonText: "",
      sortOrder: 0,
      text: "Текст шага",
      title: "Приветствие",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/funnel");
  });

  it("persists nextAction changes when saving an existing step", async () => {
    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("active", "on");
    formData.set("title", "Приветствие");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "Текст шага");
    formData.set("nextButtonText", "Далее");
    formData.set("nextAction", "activate_promo_and_next");
    formData.set("offerButtonText", "");

    await updateFunnelStep(formData);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "step_1",
        nextAction: "activate_promo_and_next",
      }),
    );
  });

  it("persists nextAction when creating a new step", async () => {
    const formData = new FormData();
    formData.set("slug", "welcome");
    formData.set("sortOrder", "0");
    formData.set("title", "Приветствие");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "Текст шага");
    formData.set("nextButtonText", "Далее");
    formData.set("nextAction", "activate_promo_and_next");
    formData.set("offerButtonText", "");

    await createFunnelStep(formData);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nextAction: "activate_promo_and_next",
        slug: "welcome",
      }),
    );
  });

  it("posts funnel updates to RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("title", "Приветствие");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "Текст шага");
    formData.set("nextButtonText", "Далее");
    formData.set("nextAction", "next");

    await updateFunnelStep(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/internal/admin/funnel/actions", "http://10.10.0.1:3000"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
