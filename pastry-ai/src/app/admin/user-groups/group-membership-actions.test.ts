import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createGroupMock,
  deleteGroupMock,
  deleteMembershipMock,
  fetchMock,
  revalidatePathMock,
  updateGroupMock,
  upsertMembershipMock,
} = vi.hoisted(() => ({
  createGroupMock: vi.fn(),
  deleteGroupMock: vi.fn(),
  deleteMembershipMock: vi.fn(),
  fetchMock: vi.fn(),
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
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
    createGroupMock.mockResolvedValue(undefined);
    updateGroupMock.mockResolvedValue(undefined);
    deleteGroupMock.mockResolvedValue(undefined);
    upsertMembershipMock.mockResolvedValue(undefined);
    deleteMembershipMock.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
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
  it("routes group mutations through RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const createFormData = new FormData();
    createFormData.set("name", " VIP ");
    createFormData.set("description", " Главные клиенты ");

    const membershipFormData = new FormData();
    membershipFormData.set("userId", "user_1");
    membershipFormData.set("userGroupId", "group_1");

    await createUserGroup(createFormData);
    await addUserToGroup(membershipFormData);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(createGroupMock).not.toHaveBeenCalled();
    expect(upsertMembershipMock).not.toHaveBeenCalled();
  });
});
