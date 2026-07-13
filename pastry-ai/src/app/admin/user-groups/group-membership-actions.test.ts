import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createGroupMock,
  deleteGroupMock,
  deleteMembershipMock,
  revalidatePathMock,
  updateGroupMock,
  upsertMembershipMock,
} = vi.hoisted(() => ({
  createGroupMock: vi.fn(),
  deleteGroupMock: vi.fn(),
  deleteMembershipMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  updateGroupMock: vi.fn(),
  upsertMembershipMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    userGroup: {
      create: createGroupMock,
      delete: deleteGroupMock,
      update: updateGroupMock,
    },
    userGroupMember: {
      deleteMany: deleteMembershipMock,
      upsert: upsertMembershipMock,
    },
  },
}));

import {
  addUserToGroup,
  createUserGroup,
  deleteUserGroup,
  removeUserFromGroup,
  updateUserGroup,
} from "./actions";

describe("user group actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createGroupMock.mockResolvedValue(undefined);
    updateGroupMock.mockResolvedValue(undefined);
    deleteGroupMock.mockResolvedValue(undefined);
    upsertMembershipMock.mockResolvedValue(undefined);
    deleteMembershipMock.mockResolvedValue(undefined);
  });

  it("adds a user to a group without creating duplicates", async () => {
    const formData = new FormData();
    formData.set("userId", "user_1");
    formData.set("userGroupId", "group_1");

    await addUserToGroup(formData);

    expect(upsertMembershipMock).toHaveBeenCalledWith({
      create: { userId: "user_1", userGroupId: "group_1" },
      update: {},
      where: {
        userId_userGroupId: {
          userId: "user_1",
          userGroupId: "group_1",
        },
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/user-groups");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/user-groups/group_1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/user_1");
  });

  it("creates, updates, and deletes a user group with trimmed values", async () => {
    const createFormData = new FormData();
    createFormData.set("name", " VIP ");
    createFormData.set("description", " Главные клиенты ");

    await createUserGroup(createFormData);

    expect(createGroupMock).toHaveBeenCalledWith({
      data: {
        description: "Главные клиенты",
        name: "VIP",
      },
    });

    const updateFormData = new FormData();
    updateFormData.set("id", "group_1");
    updateFormData.set("name", " VIP+ ");
    updateFormData.set("description", " Обновленное описание ");

    await updateUserGroup(updateFormData);

    expect(updateGroupMock).toHaveBeenCalledWith({
      data: {
        description: "Обновленное описание",
        name: "VIP+",
      },
      where: { id: "group_1" },
    });

    const deleteFormData = new FormData();
    deleteFormData.set("id", "group_1");

    await deleteUserGroup(deleteFormData);

    expect(deleteGroupMock).toHaveBeenCalledWith({
      where: { id: "group_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/user-groups/group_1");
  });

  it("removes a user from a group and refreshes related admin screens", async () => {
    const formData = new FormData();
    formData.set("userId", "user_1");
    formData.set("userGroupId", "group_1");

    await removeUserFromGroup(formData);

    expect(deleteMembershipMock).toHaveBeenCalledWith({
      where: {
        userGroupId: "group_1",
        userId: "user_1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/user-groups");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/user-groups/group_1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/user_1");
  });
});
