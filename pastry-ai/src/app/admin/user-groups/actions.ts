"use server";

import { revalidatePath } from "next/cache";
import {
  performAddUserToGroup,
  performCreateUserGroup,
  performDeleteUserGroup,
  performRemoveUserFromGroup,
  performUpdateUserGroup,
} from "@/features/admin/groups/service";
import {
  postInternalAdminGroupAction,
} from "@/features/admin/groups/internal-admin-client";

function readTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateUserGroupPaths(userGroupId?: string, userId?: string) {
  revalidatePath("/admin/user-groups");

  if (userGroupId) {
    revalidatePath(`/admin/user-groups/${userGroupId}`);
  }

  if (userId) {
    revalidatePath(`/admin/users/${userId}`);
  }
}

export async function createUserGroup(formData: FormData): Promise<void> {
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");

  if (!name) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("createUserGroup", { description, name });
  } else {
    await performCreateUserGroup({ description, name });
  }

  revalidateUserGroupPaths();
}

export async function updateUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");

  if (!id || !name) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("updateUserGroup", { description, id, name });
  } else {
    await performUpdateUserGroup({ description, id, name });
  }

  revalidateUserGroupPaths(id);
}

export async function deleteUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");

  if (!id) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("deleteUserGroup", { id });
  } else {
    await performDeleteUserGroup(id);
  }

  revalidateUserGroupPaths(id);
}

export async function addUserToGroup(formData: FormData): Promise<void> {
  const userId = readTrimmedString(formData, "userId");
  const userGroupId = readTrimmedString(formData, "userGroupId");

  if (!userId || !userGroupId) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("addUserToGroup", { userGroupId, userId });
  } else {
    await performAddUserToGroup(userId, userGroupId);
  }

  revalidateUserGroupPaths(userGroupId, userId);
}

export async function removeUserFromGroup(formData: FormData): Promise<void> {
  const userId = readTrimmedString(formData, "userId");
  const userGroupId = readTrimmedString(formData, "userGroupId");

  if (!userId || !userGroupId) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("removeUserFromGroup", { userGroupId, userId });
  } else {
    await performRemoveUserFromGroup(userId, userGroupId);
  }

  revalidateUserGroupPaths(userGroupId, userId);
}
