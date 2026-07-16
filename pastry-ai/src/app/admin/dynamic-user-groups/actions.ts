"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/db/prisma";
import { parseDynamicUserGroupDefinition } from "@/features/dynamic-user-groups/rule-validator";

function readTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readStatus(formData: FormData) {
  return readTrimmedString(formData, "status") === "disabled" ? "disabled" : "active";
}

function readDefinition(formData: FormData) {
  const raw = String(formData.get("definition") ?? "");

  if (!raw) {
    return null;
  }

  try {
    return parseDynamicUserGroupDefinition(JSON.parse(raw));
  } catch {
    return null;
  }
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
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");
  const definition = readDefinition(formData);

  if (!name || !definition) {
    return;
  }

  await prisma.dynamicUserGroup.create({
    data: {
      name,
      description: description || null,
      status: readStatus(formData),
      logicOperator: definition.logicOperator,
      conditionsJson: definition.conditions,
    },
  });

  revalidateDynamicUserGroupPaths();
}

export async function updateDynamicUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");
  const definition = readDefinition(formData);

  if (!id || !name || !definition) {
    return;
  }

  await prisma.dynamicUserGroup.update({
    where: { id },
    data: {
      name,
      description: description || null,
      status: readStatus(formData),
      logicOperator: definition.logicOperator,
      conditionsJson: definition.conditions,
    },
  });

  revalidateDynamicUserGroupPaths(id);
}

export async function deleteDynamicUserGroup(formData: FormData): Promise<void> {
  const id = readTrimmedString(formData, "id");

  if (!id) {
    return;
  }

  await prisma.dynamicUserGroup.delete({
    where: { id },
  });

  revalidateDynamicUserGroupPaths(id);
}
