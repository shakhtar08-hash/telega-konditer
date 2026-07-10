import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createMock,
  updateMock,
  deleteMock,
  findManyMock,
  findFirstMock,
  findUniqueMock,
  findFirstScheduledMock,
  findManyScheduledMock,
  updateManyScheduledMock,
  updateScheduledMock,
  deleteManyScheduledMock,
  transactionMock,
  redirectMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  findUniqueMock: vi.fn(),
  findFirstScheduledMock: vi.fn(),
  findManyScheduledMock: vi.fn(),
  updateManyScheduledMock: vi.fn(),
  updateScheduledMock: vi.fn(),
  deleteManyScheduledMock: vi.fn(),
  transactionMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    tariffPlan: {
      findMany: findManyMock,
    },
    triggerMessage: {
      create: createMock,
      update: updateMock,
      delete: deleteMock,
      findFirst: findFirstMock,
      findUnique: findUniqueMock,
      findMany: findManyMock,
    },
    scheduledMessage: {
      findFirst: findFirstScheduledMock,
      findMany: findManyScheduledMock,
      update: updateScheduledMock,
      updateMany: updateManyScheduledMock,
      deleteMany: deleteManyScheduledMock,
    },
  },
}));

import { createTriggerMessage, updateTriggerMessage, deleteTriggerMessage } from "./page";

describe("trigger actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "new_trigger" });
    updateMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
    findManyMock.mockResolvedValue([{ slug: "promo" }]);
    findUniqueMock.mockResolvedValue(null);
    findFirstMock.mockResolvedValue(null);
    transactionMock.mockImplementation((fnOrArray: unknown) => {
      if (typeof fnOrArray === "function") {
        return fnOrArray({
          triggerMessage: {
            update: updateMock,
            delete: deleteMock,
          },
          scheduledMessage: {
            findMany: findManyScheduledMock,
            update: updateScheduledMock,
            deleteMany: deleteManyScheduledMock,
          },
        });
      }
      if (Array.isArray(fnOrArray)) {
        return Promise.all(fnOrArray.map((op) => (typeof op === "function" ? op() : op)));
      }
      return Promise.resolve([]);
    });
    findManyScheduledMock.mockResolvedValue([]);
  });

  it("redirects with a friendly duplicate-delay error on create", async () => {
    findFirstMock.mockResolvedValue({ id: "existing_message" });

    const formData = new FormData();
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "15");
    formData.set("target_promo", "on");

    await expect(createTriggerMessage(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith(
      "/admin/triggers?error=duplicate-delay&slug=after-start&delayMinutes=15",
    );
  });

  it("creates trigger message when slug + delayMinutes is unique", async () => {
    const formData = new FormData();
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "30");
    formData.set("target_promo", "on");

    await createTriggerMessage(formData);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "after-start",
          delayMinutes: 30,
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/triggers");
  });

  it("stores manual imageUrl on create", async () => {
    const formData = new FormData();
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "15");
    formData.set("imageUrl", "/uploads/admin/triggers/start.webp");
    formData.set("target_promo", "on");

    await createTriggerMessage(formData);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: "/uploads/admin/triggers/start.webp",
        }),
      }),
    );
  });

  it("stores manual imageUrl on update", async () => {
    const formData = new FormData();
    formData.set("id", "trigger_1");
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "30");
    formData.set("imageUrl", "/uploads/admin/triggers/edited.webp");
    formData.set("target_promo", "on");
    formData.set("active", "on");

    await updateTriggerMessage(formData);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: "/uploads/admin/triggers/edited.webp",
        }),
      }),
    );
  });

  it("redirects with duplicate-delay error on update when delay collides", async () => {
    findFirstMock.mockResolvedValue({ id: "other_trigger" });

    const formData = new FormData();
    formData.set("id", "trigger_1");
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Текст");
    formData.set("delayMinutes", "15");
    formData.set("target_promo", "on");
    formData.set("active", "on");

    await expect(updateTriggerMessage(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith(
      "/admin/triggers?error=duplicate-delay&slug=after-start&delayMinutes=15",
    );
  });

  it("recalculates sendAt for unsent rows on update", async () => {
    findFirstMock.mockResolvedValue(null);
    findManyScheduledMock.mockResolvedValue([
      { id: "s1", triggeredAt: new Date("2026-07-10T17:00:00.000Z") },
      { id: "s2", triggeredAt: new Date("2026-07-10T18:00:00.000Z") },
    ]);

    const formData = new FormData();
    formData.set("id", "trigger_1");
    formData.set("slug", "after-start");
    formData.set("title", "После старта");
    formData.set("text", "Новый текст");
    formData.set("delayMinutes", "45");
    formData.set("target_promo", "on");
    formData.set("active", "on");

    await updateTriggerMessage(formData);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "trigger_1" },
        data: expect.objectContaining({
          title: "После старта",
          delayMinutes: 45,
        }),
      }),
    );

    expect(findManyScheduledMock).toHaveBeenCalledWith({
      where: { triggerMessageId: "trigger_1", sentAt: null },
      select: { id: true, triggeredAt: true },
    });

    expect(updateScheduledMock).toHaveBeenCalledTimes(2);
  });

  it("deletes unsent scheduled rows on delete", async () => {
    deleteManyScheduledMock.mockResolvedValue({ count: 2 });

    const formData = new FormData();
    formData.set("id", "trigger_1");

    await deleteTriggerMessage(formData);

    expect(deleteManyScheduledMock).toHaveBeenCalledWith({
      where: { triggerMessageId: "trigger_1", sentAt: null },
    });

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "trigger_1" } });
  });
});