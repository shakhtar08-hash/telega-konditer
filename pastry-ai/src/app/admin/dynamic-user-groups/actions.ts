"use server";

import { revalidatePath } from "next/cache";
import {
  performCreateDynamicUserGroup,
  performDeleteDynamicUserGroup,
  performUpdateDynamicUserGroup,
} from "@/features/admin/groups/service";
import {
  postInternalAdminGroupAction,
} from "@/features/admin/groups/internal-admin-client";

function readTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateDynamicUserGroupPaths(groupId?: string) {
  revalidatePath("/admin/dynamic-user-groups");
  revalidatePath("/admin/users");
  revalidatePath("/admin/triggers");

  if (groupId) {
    revalidatePath(`/admin/dynamic-user-groups/${groupId}`);
    revalidatePath(`/admin/users?dynamicGroupId=${groupId}`);
  }
}

export async function createDynamicUserGroup(formData: FormData): Promise<void> {
  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("createDynamicUserGroup", formData);
  } else {
    await performCreateDynamicUserGroup(formData);
  }

  revalidateDynamicUserGroupPaths();
}

export async function updateDynamicUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("updateDynamicUserGroup", formData);
  } else {
    await performUpdateDynamicUserGroup(formData);
  }

  revalidateDynamicUserGroupPaths(id);
}

export async function deleteDynamicUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");

  if (!id) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminGroupAction("deleteDynamicUserGroup", { id });
  } else {
    await performDeleteDynamicUserGroup(id);
  }

  revalidateDynamicUserGroupPaths(id);
}
