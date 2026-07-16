import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  addUserToGroupFromTask2Mock,
  prismaMock,
  removeUserFromGroupFromTask2Mock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  addUserToGroupFromTask2Mock: vi.fn(),
  prismaMock: {
    tariffPlan: {
      findUnique: vi.fn(),
    },
    userTariff: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  removeUserFromGroupFromTask2Mock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../user-groups/actions", () => ({
  addUserToGroup: addUserToGroupFromTask2Mock,
  removeUserFromGroup: removeUserFromGroupFromTask2Mock,
}));

import {
  addUserToGroup,
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
  });

  it("delegates user group membership actions to the shared handlers", async () => {
    const addFormData = new FormData();
    addFormData.set("userId", "user_1");
    addFormData.set("userGroupId", "group_1");

    const removeFormData = new FormData();
    removeFormData.set("userId", "user_1");
    removeFormData.set("userGroupId", "group_1");

    await addUserToGroup(addFormData);
    await removeUserFromGroup(removeFormData);

    expect(addUserToGroupFromTask2Mock).toHaveBeenCalledWith(addFormData);
    expect(removeUserFromGroupFromTask2Mock).toHaveBeenCalledWith(removeFormData);
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
        expiresAt: new Date("2026-08-01T13:00"),
        remainingTokens: 24,
        tariffPlanId: "plan_1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/user_1");
  });
});
