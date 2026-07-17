"use server";

import { revalidatePath } from "next/cache";
import {
  performAddUserToGroup,
  performDeleteUser,
  performRemoveUserFromGroup,
  performUpdateUserTariff,
} from "@/features/admin/users/service";
import {
  postInternalAdminUserAction,
  shouldUseInternalAdminBridge,
} from "@/features/admin/users/internal-admin-client";

function revalidateUserAdminPaths(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function addUserToGroup(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const userGroupId = String(formData.get("userGroupId") ?? "").trim();

  if (shouldUseInternalAdminBridge()) {
    await postInternalAdminUserAction("addUserToGroup", { userGroupId, userId });
  } else {
    await performAddUserToGroup(userId, userGroupId);
  }

  revalidateUserAdminPaths(userId);
}

export async function removeUserFromGroup(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const userGroupId = String(formData.get("userGroupId") ?? "").trim();

  if (shouldUseInternalAdminBridge()) {
    await postInternalAdminUserAction("removeUserFromGroup", { userGroupId, userId });
  } else {
    await performRemoveUserFromGroup(userId, userGroupId);
  }

  revalidateUserAdminPaths(userId);
}

export async function updateUserTariff(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const tariffPlanId = String(formData.get("tariffPlanId") ?? "");
  const expiresAtValue = String(formData.get("expiresAt") ?? "").trim();
  const tokensValue = String(formData.get("tokens") ?? "").trim();

  if (!id) {
    return;
  }

  if (shouldUseInternalAdminBridge()) {
    await postInternalAdminUserAction("updateUserTariff", {
      expiresAt: expiresAtValue,
      id,
      tariffPlanId,
      tokens: tokensValue,
    });
  } else {
    await performUpdateUserTariff({
      expiresAtValue,
      tariffPlanId,
      tokensValue,
      userId: id,
    });
  }

  revalidateUserAdminPaths(id);
}

export async function deleteUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  if (shouldUseInternalAdminBridge()) {
    await postInternalAdminUserAction("deleteUser", { id });
  } else {
    await performDeleteUser(id);
  }

  revalidateUserAdminPaths(id);
}
