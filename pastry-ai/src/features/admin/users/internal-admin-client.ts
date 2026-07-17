import {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";

export {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";

function reviveUserTariff<T extends { expiresAt: string } | null>(value: T) {
  if (!value) {
    return null;
  }

  return {
    ...value,
    expiresAt: new Date(value.expiresAt),
  };
}

export async function fetchInternalAdminUsersPageData(dynamicGroupId = "") {
  const data = await fetchInternalAdminJson<{
    dynamicGroupOptions: Array<{ label: string; value: string }>;
    tariffPlans: Array<{ id: string; name: string; slug: string }>;
    users: Array<{
      createdAt: string;
      id: string;
      name: string | null;
      telegramId: string;
      userTariff: {
        expiresAt: string;
        remainingTokens: number;
        tariffPlan: { id: string; name: string; slug: string };
      } | null;
      username: string | null;
    }>;
  }>(`/api/internal/admin/users?dynamicGroupId=${encodeURIComponent(dynamicGroupId)}`);

  return {
    dynamicGroupOptions: data.dynamicGroupOptions,
    tariffPlans: data.tariffPlans,
    users: data.users.map((user) => ({
      ...user,
      createdAt: new Date(user.createdAt),
      userTariff: reviveUserTariff(user.userTariff),
    })),
  };
}

export async function fetchInternalAdminUserDetailPageData(userId: string) {
  const data = await fetchInternalAdminJson<{
    groups: Array<{ id: string; name: string }>;
    matchingDynamicGroups: Array<{ id: string; name: string }>;
    tariffPlans: Array<{ id: string; name: string; slug: string }>;
    user: {
      createdAt: string;
      groupMemberships: Array<{
        createdAt: string;
        userGroup: { id: string; name: string };
        userGroupId: string;
      }>;
      id: string;
      name: string | null;
      promoClaimed: boolean;
      telegramId: string;
      userTariff: {
        expiresAt: string;
        remainingTokens: number;
        tariffPlan: { id: string; name: string; slug: string };
      } | null;
      username: string | null;
    };
  }>(`/api/internal/admin/users/${encodeURIComponent(userId)}`);

  return {
    groups: data.groups,
    matchingDynamicGroups: data.matchingDynamicGroups,
    tariffPlans: data.tariffPlans,
    user: {
      ...data.user,
      createdAt: new Date(data.user.createdAt),
      groupMemberships: data.user.groupMemberships.map((membership) => ({
        ...membership,
        createdAt: new Date(membership.createdAt),
      })),
      userTariff: reviveUserTariff(data.user.userTariff),
    },
  };
}

export async function postInternalAdminUserAction(
  action: "addUserToGroup" | "deleteUser" | "removeUserFromGroup" | "updateUserTariff",
  payload: Record<string, string>,
) {
  await fetchInternalAdminJson("/api/internal/admin/users/actions", {
    body: JSON.stringify({ action, payload }),
    method: "POST",
  });
}
