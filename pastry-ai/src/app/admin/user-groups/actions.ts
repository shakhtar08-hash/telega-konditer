"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/prisma";

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

  await prisma.userGroup.create({
    data: {
      description: description || null,
      name,
    },
  });

  revalidateUserGroupPaths();
}

export async function updateUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");

  if (!id || !name) {
    return;
  }

  await prisma.userGroup.update({
    data: {
      description: description || null,
      name,
    },
    where: { id },
  });

  revalidateUserGroupPaths(id);
}

export async function deleteUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");

  if (!id) {
    return;
  }

  await prisma.userGroup.delete({
    where: { id },
  });

  revalidateUserGroupPaths(id);
}

export async function addUserToGroup(formData: FormData): Promise<void> {
  const userId = readTrimmedString(formData, "userId");
  const userGroupId = readTrimmedString(formData, "userGroupId");

  if (!userId || !userGroupId) {
    return;
  }

  await prisma.userGroupMember.upsert({
    create: { userId, userGroupId },
    update: {},
    where: {
      userId_userGroupId: { userId, userGroupId },
    },
  });

  revalidateUserGroupPaths(userGroupId, userId);
}

export async function removeUserFromGroup(formData: FormData): Promise<void> {
  const userId = readTrimmedString(formData, "userId");
  const userGroupId = readTrimmedString(formData, "userGroupId");

  if (!userId || !userGroupId) {
    return;
  }

  await prisma.userGroupMember.deleteMany({
    where: { userGroupId, userId },
  });

  revalidateUserGroupPaths(userGroupId, userId);
}
