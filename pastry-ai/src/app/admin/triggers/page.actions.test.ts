import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createMock,
  deleteMock,
  redirectMock,
  revalidatePathMock,
  saveAdminImageMock,
  updateMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  deleteMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  revalidatePathMock: vi.fn(),
  saveAdminImageMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/app/admin/_lib/save-admin-image", () => ({
  saveAdminImage: saveAdminImageMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    triggerRule: {
      create: createMock,
      delete: deleteMock,
      update: updateMock,
    },
  },
}));

import {
  createTriggerRule,
  deleteTriggerRule,
  updateTriggerRule,
} from "./actions";

describe("trigger rule actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
    saveAdminImageMock.mockImplementation(async ({ manualValue }) => manualValue || null);
  });

  it("creates a trigger rule with event, conditions, and delay unit", async () => {
    const formData = new FormData();
    formData.set("name", "After Start: no promo");
    formData.set("eventKey", "user.started");
    formData.set("delayValue", "15");
    formData.set("delayUnit", "minutes");
    formData.set("messageText", "Hello!");
    formData.set(
      "conditions",
      JSON.stringify([
        { field: "promoClaimed", operator: "is", value: false },
        { field: "hasActiveTariff", operator: "is", value: false },
      ]),
    );

    await expect(createTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          buttons: [],
          conditions: [
            { field: "promoClaimed", operator: "is", value: false },
            { field: "hasActiveTariff", operator: "is", value: false },
          ],
          delayUnit: "minutes",
          delayValue: 15,
          eventKey: "user.started",
          imageUrl: null,
          messageText: "Hello!",
          name: "After Start: no promo",
          status: "draft",
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/triggers");
    expect(redirectMock).toHaveBeenCalledWith("/admin/triggers");
  });

  it("filters unsupported conditions before persisting", async () => {
    const formData = new FormData();
    formData.set("name", "Safe trigger");
    formData.set("eventKey", "user.started");
    formData.set("delayValue", "5");
    formData.set("delayUnit", "minutes");
    formData.set("messageText", "Hello!");
    formData.set(
      "conditions",
      JSON.stringify([
        { field: "promoClaimed", operator: "is", value: false },
        { field: "unknown", operator: "hack", value: "oops" },
      ]),
    );

    await expect(createTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conditions: [{ field: "promoClaimed", operator: "is", value: false }],
        }),
      }),
    );
  });

  it("accepts only structured user group conditions", async () => {
    const formData = new FormData();
    formData.set("name", "Group trigger");
    formData.set("eventKey", "user.started");
    formData.set("delayValue", "5");
    formData.set("delayUnit", "minutes");
    formData.set("messageText", "Hello!");
    formData.set(
      "conditions",
      JSON.stringify([
        { field: "userGroupId", operator: "isMember", value: "group_vip" },
        { field: "groupId", operator: "contains", value: "legacy-group" },
      ]),
    );

    await expect(createTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conditions: [{ field: "userGroupId", operator: "isMember", value: "group_vip" }],
        }),
      }),
    );
  });

  it("normalizes unsupported and negative delay input before create", async () => {
    const formData = new FormData();
    formData.set("name", "Unsafe delay");
    formData.set("eventKey", "user.started");
    formData.set("delayValue", "-15");
    formData.set("delayUnit", "weeks");
    formData.set("messageText", "Hello!");
    formData.set("conditions", "[]");

    await expect(createTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delayUnit: "now",
          delayValue: 0,
        }),
      }),
    );
  });

  it("does not save an uploaded image for an invalid create submission", async () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("eventKey", "user.started");
    formData.set("delayValue", "15");
    formData.set("delayUnit", "minutes");
    formData.set("messageText", "Hello!");
    formData.set("conditions", "[]");
    formData.set("imageFile", new File(["binary"], "cake.png", { type: "image/png" }));

    await createTriggerRule(formData);

    expect(saveAdminImageMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("updates an existing trigger rule with structured fields", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");
    formData.set("name", "Promo expired");
    formData.set("eventKey", "promo.expired");
    formData.set("delayValue", "2");
    formData.set("delayUnit", "hours");
    formData.set("status", "active");
    formData.set("messageText", "Come back!");
    formData.set("imageUrl", "/uploads/admin/triggers/reminder.png");
    formData.set(
      "conditions",
      JSON.stringify([{ field: "generationCount", operator: "gte", value: 3 }]),
    );

    await expect(updateTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conditions: [{ field: "generationCount", operator: "gte", value: 3 }],
        delayUnit: "hours",
        delayValue: 2,
        eventKey: "promo.expired",
        imageUrl: "/uploads/admin/triggers/reminder.png",
        messageText: "Come back!",
        name: "Promo expired",
        status: "active",
      }),
      where: { id: "rule_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/triggers");
    expect(redirectMock).toHaveBeenCalledWith("/admin/triggers");
  });

  it("clamps invalid delay updates to a safe supported value", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");
    formData.set("name", "Promo expired");
    formData.set("eventKey", "promo.expired");
    formData.set("delayValue", "-2");
    formData.set("delayUnit", "hours");
    formData.set("status", "active");
    formData.set("messageText", "Come back!");
    formData.set("conditions", "[]");

    await expect(updateTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        delayUnit: "hours",
        delayValue: 0,
      }),
      where: { id: "rule_1" },
    });
  });

  it("does not save an uploaded image for an invalid update submission", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");
    formData.set("name", "Promo expired");
    formData.set("eventKey", "");
    formData.set("delayValue", "2");
    formData.set("delayUnit", "hours");
    formData.set("status", "active");
    formData.set("messageText", "Come back!");
    formData.set("conditions", "[]");
    formData.set("imageFile", new File(["binary"], "reminder.png", { type: "image/png" }));

    await updateTriggerRule(formData);

    expect(saveAdminImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("deletes a trigger rule by id", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    await expect(deleteTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(deleteMock).toHaveBeenCalledWith({
      where: { id: "rule_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/triggers");
    expect(redirectMock).toHaveBeenCalledWith("/admin/triggers");
  });
});
