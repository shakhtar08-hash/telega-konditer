import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, revalidatePathMock, saveAdminImageMock, updateMock } = vi.hoisted(
  () => ({
    createMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    saveAdminImageMock: vi.fn(),
    updateMock: vi.fn(),
  }),
);

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/features/admin/funnel/service", () => ({
  loadAdminFunnelPageData: vi.fn(),
  performCreateFunnelStep: createMock,
  performUpdateFunnelStep: updateMock,
}));

vi.mock("../_lib/save-admin-image", () => ({
  saveAdminImage: saveAdminImageMock,
}));

import { createFunnelStep, updateFunnelStep } from "./page";

describe("funnel step actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    updateMock.mockResolvedValue(undefined);
    createMock.mockResolvedValue(undefined);
    saveAdminImageMock.mockResolvedValue("/saved/by-eu.jpg");
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
  });

  it("keeps inactive buttons when saving an existing step", async () => {
    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("active", "on");
    formData.set("title", "РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "РўРµРєСЃС‚ С€Р°РіР°");
    formData.set("nextButtonText", "Р”Р°Р»РµРµ");
    formData.set("nextAction", "next");
    formData.set("offerButtonText", "");
    formData.set("buyButtonText[]", "РљСѓРїРёС‚СЊ");
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
          text: "РљСѓРїРёС‚СЊ",
          url: "{{baseUrl}}/pay",
        },
      ],
      firstBuyButton: undefined,
      id: "step_1",
      imagePath: "/saved/by-eu.jpg",
      nextAction: "next",
      nextButtonText: "Р”Р°Р»РµРµ",
      offerButtonText: "",
      sortOrder: 0,
      text: "РўРµРєСЃС‚ С€Р°РіР°",
      title: "РџСЂРёРІРµС‚СЃС‚РІРёРµ",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/funnel");
  });

  it("persists nextAction changes when saving an existing step", async () => {
    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("active", "on");
    formData.set("title", "РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "РўРµРєСЃС‚ С€Р°РіР°");
    formData.set("nextButtonText", "Р”Р°Р»РµРµ");
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
    formData.set("title", "РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "РўРµРєСЃС‚ С€Р°РіР°");
    formData.set("nextButtonText", "Р”Р°Р»РµРµ");
    formData.set("nextAction", "activate_promo_and_next");
    formData.set("offerButtonText", "");

    await createFunnelStep(formData);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        imagePath: "/saved/by-eu.jpg",
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
    formData.set("title", "РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "РўРµРєСЃС‚ С€Р°РіР°");
    formData.set("nextButtonText", "Р”Р°Р»РµРµ");
    formData.set("nextAction", "next");

    await updateFunnelStep(formData);

    expect(updateMock).not.toHaveBeenCalled();
    expect(saveAdminImageMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/internal/admin/funnel/actions", "http://10.10.0.1:3000"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fails closed on ingress when the bridge is not configured", async () => {
    process.env.APP_ROLE = "ingress";

    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("title", "РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    formData.set("imagePath", "/onboarding/1.jpg");
    formData.set("text", "РўРµРєСЃС‚ С€Р°РіР°");
    formData.set("nextButtonText", "Р”Р°Р»РµРµ");
    formData.set("nextAction", "next");

    await expect(updateFunnelStep(formData)).rejects.toThrow(
      "Internal admin bridge is not configured",
    );
    expect(updateMock).not.toHaveBeenCalled();
    expect(saveAdminImageMock).not.toHaveBeenCalled();
  });

  it("forwards uploads to RU instead of saving them on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["img"], "step.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("id", "step_1");
    formData.set("sortOrder", "0");
    formData.set("title", "РџСЂРёРІРµС‚СЃС‚РІРёРµ");
    formData.set("imagePath", "");
    formData.set("imageFile", file);
    formData.set("text", "РўРµРєСЃС‚ С€Р°РіР°");
    formData.set("nextButtonText", "Р”Р°Р»РµРµ");
    formData.set("nextAction", "next");

    await updateFunnelStep(formData);

    expect(saveAdminImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.body).toBeInstanceOf(FormData);
    const forwarded = init.body as FormData;
    expect(forwarded.get("action")).toBe("updateFunnelStep");
    expect(forwarded.get("imageFile")).toBe(file);
  });
});
