import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, prismaMock } = vi.hoisted(() => ({
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
  removeUserFromGroup,
  updateUserTariff,
} from "./actions";
import {
  addUserToGroup as addUserToGroupFromTask2,
  removeUserFromGroup as removeUserFromGroupFromTask2,
} from "../user-groups/actions";

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

  it("reuses the shared user group membership actions from Task 2", () => {
    expect(addUserToGroup).toBe(addUserToGroupFromTask2);
    expect(removeUserFromGroup).toBe(removeUserFromGroupFromTask2);
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
