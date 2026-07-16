import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findManyMock, revalidatePathMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    funnelStep: {
      create: createMock,
      findMany: findManyMock,
      update: updateMock,
    },
  },
}));

import { createFunnelStep, updateFunnelStep } from "./page";

describe("funnel step actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockResolvedValue(undefined);
    createMock.mockResolvedValue(undefined);
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
      data: expect.objectContaining({
        buyButtonText: "",
        buyButtonUrl: null,
        buyButtons: [
          {
            active: false,
            sortOrder: 0,
            text: "Купить",
            url: "{{baseUrl}}/pay",
          },
        ],
      }),
      where: { id: "step_1" },
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

    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nextAction: "activate_promo_and_next",
      }),
      where: { id: "step_1" },
    });
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

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nextAction: "activate_promo_and_next",
      }),
    });
  });
});
