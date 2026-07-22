import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    tariffPlan: {
      findUnique: vi.fn(),
    },
    conversation: {
      deleteMany: vi.fn(),
    },
    generatedRecipeContext: {
      deleteMany: vi.fn(),
    },
    payment: {
      deleteMany: vi.fn(),
    },
    subscription: {
      deleteMany: vi.fn(),
    },
    tokenUsage: {
      deleteMany: vi.fn(),
    },
    usage: {
      deleteMany: vi.fn(),
    },
    user: {
      delete: vi.fn(),
    },
    userGroupMember: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    userTariff: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

import {
  addUserToGroup,
  deleteUser,
  removeUserFromGroup,
  updateUserTariff,
} from "./actions";

describe("admin user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tariffPlan.findUnique.mockResolvedValue({
      id: "plan_1",
      durationDays: 30,
      tokenAmount: 50,
    });
    prismaMock.userTariff.findUnique.mockResolvedValue({ id: "tariff_1" });
    prismaMock.userTariff.update.mockResolvedValue(undefined);
    prismaMock.userTariff.create.mockResolvedValue(undefined);
    prismaMock.userTariff.deleteMany.mockResolvedValue(undefined);
    prismaMock.userGroupMember.upsert.mockResolvedValue(undefined);
    prismaMock.userGroupMember.deleteMany.mockResolvedValue(undefined);
    prismaMock.tokenUsage.deleteMany.mockResolvedValue(undefined);
    prismaMock.usage.deleteMany.mockResolvedValue(undefined);
    prismaMock.generatedRecipeContext.deleteMany.mockResolvedValue(undefined);
    prismaMock.conversation.deleteMany.mockResolvedValue(undefined);
    prismaMock.payment.deleteMany.mockResolvedValue(undefined);
    prismaMock.subscription.deleteMany.mockResolvedValue(undefined);
    prismaMock.user.delete.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(async (operations) => Promise.all(operations));
  });

  it("updates user group membership and refreshes both admin pages", async () => {
    const addFormData = new FormData();
    addFormData.set("userId", "user_1");
    addFormData.set("userGroupId", "group_1");

    const removeFormData = new FormData();
    removeFormData.set("userId", "user_1");
    removeFormData.set("userGroupId", "group_1");

    await addUserToGroup(addFormData);
    await removeUserFromGroup(removeFormData);

    expect(prismaMock.userGroupMember.upsert).toHaveBeenCalledWith({
      create: { userId: "user_1", userGroupId: "group_1" },
      update: {},
      where: {
        userId_userGroupId: { userId: "user_1", userGroupId: "group_1" },
      },
    });
    expect(prismaMock.userGroupMember.deleteMany).toHaveBeenCalledWith({
      where: { userGroupId: "group_1", userId: "user_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/user_1");
  });

  it("refreshes both the list and detail pages after a tariff update", async () => {
    const formData = new FormData();
    formData.set("id", "user_1");
    formData.set("tariffPlanId", "plan_1");
    formData.set("tokens", "24");
    formData.set("expiresAt", "2026-08-01T13:00");

    await updateUserTariff(formData);

    expect(prismaMock.userTariff.update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: {
        expiresAt: new Date("2026-08-01T10:00:00.000Z"),
        remainingTokens: 24,
        tariffPlanId: "plan_1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/user_1");
  });

  it("deletes related user data before deleting the user and refreshes both admin pages", async () => {
    const formData = new FormData();
    formData.set("id", "user_1");

    await deleteUser(formData);

    expect(prismaMock.userTariff.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.userGroupMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.tokenUsage.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.usage.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.generatedRecipeContext.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.conversation.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.payment.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.subscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: "user_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/user_1");
  });
});
