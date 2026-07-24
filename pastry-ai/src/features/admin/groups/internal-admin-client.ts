import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type { DynamicUserGroupDefinition } from "@/features/dynamic-user-groups/rule-types";
import type {
  AdminDynamicGroupListRecord,
  AdminUserGroupDetailRecord,
  AdminUserGroupListRecord,
} from "./service";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

function reviveUserGroupListRecord(
  group: Omit<AdminUserGroupListRecord, "updatedAt"> & { updatedAt: string },
): AdminUserGroupListRecord {
  return {
    ...group,
    updatedAt: new Date(group.updatedAt),
  };
}

function reviveUserGroupDetailData(
  data: Omit<AdminUserGroupDetailRecord, "group" | "members"> & {
    group: Omit<AdminUserGroupDetailRecord["group"], "updatedAt"> & { updatedAt: string };
    members: Array<
      Omit<AdminUserGroupDetailRecord["members"][number], "createdAt"> & {
        createdAt: string;
      }
    >;
  },
): AdminUserGroupDetailRecord {
  return {
    ...data,
    group: {
      ...data.group,
      updatedAt: new Date(data.group.updatedAt),
    },
    members: data.members.map((member) => ({
      ...member,
      createdAt: new Date(member.createdAt),
    })),
  };
}

function reviveDynamicGroupListRecord(
  group: Omit<AdminDynamicGroupListRecord, "updatedAt"> & { updatedAt: string },
): AdminDynamicGroupListRecord {
  return {
    ...group,
    updatedAt: new Date(group.updatedAt),
  };
}

function cloneFormData(input: FormData | Record<string, string>) {
  const formData = new FormData();

  if (input instanceof FormData) {
    for (const [key, value] of input.entries()) {
      formData.append(key, value);
    }
    return formData;
  }

  for (const [key, value] of Object.entries(input)) {
    formData.set(key, value);
  }

  return formData;
}

export async function fetchInternalAdminUserGroupsPageData(): Promise<{
  groups: AdminUserGroupListRecord[];
  unavailable: boolean;
}> {
  const data = await fetchInternalAdminJson<{
    groups: Array<Omit<AdminUserGroupListRecord, "updatedAt"> & { updatedAt: string }>;
    unavailable?: boolean;
  }>("/api/internal/admin/groups?kind=user");

  return {
    groups: data.groups.map((group) => reviveUserGroupListRecord(group)),
    unavailable: data.unavailable ?? false,
  };
}

export async function fetchInternalAdminUserGroupDetailPageData(
  groupId: string,
  search = "",
) {
  const query = new URLSearchParams({ kind: "user" });
  if (search) {
    query.set("search", search);
  }

  const data = await fetchInternalAdminJson<
    Omit<AdminUserGroupDetailRecord, "group" | "members"> & {
      group: Omit<AdminUserGroupDetailRecord["group"], "updatedAt"> & { updatedAt: string };
      members: Array<
        Omit<AdminUserGroupDetailRecord["members"][number], "createdAt"> & {
          createdAt: string;
        }
      >;
    }
  >(`/api/internal/admin/groups/${encodeURIComponent(groupId)}?${query.toString()}`);

  return reviveUserGroupDetailData(data);
}

export async function fetchInternalAdminDynamicGroupsPageData(): Promise<{
  groups: AdminDynamicGroupListRecord[];
  unavailable: boolean;
}> {
  const data = await fetchInternalAdminJson<{
    groups: Array<Omit<AdminDynamicGroupListRecord, "updatedAt"> & { updatedAt: string }>;
    unavailable?: boolean;
  }>("/api/internal/admin/groups?kind=dynamic");

  return {
    groups: data.groups.map((group) => reviveDynamicGroupListRecord(group)),
    unavailable: data.unavailable ?? false,
  };
}

export async function fetchInternalAdminDynamicGroupDetailPageData(groupId: string) {
  const data = await fetchInternalAdminJson<{
    preview: {
      group:
        | null
        | {
            id: string;
            name: string;
            description: string | null;
            status: string;
            logicOperator: string;
            conditionsJson: unknown;
            createdAt: string;
            updatedAt: string;
            definition: DynamicUserGroupDefinition;
          };
      rows: Array<{
        id: string;
        telegramId: string;
        username: string | null;
        name: string | null;
        createdAt: string;
        context: Record<string, unknown>;
      }>;
      total: number;
    };
    usedBy: Array<{ id: string; name: string; conditions: unknown }>;
  }>(`/api/internal/admin/groups/${encodeURIComponent(groupId)}?kind=dynamic`);

  return {
    preview: {
      ...data.preview,
      group: data.preview.group
        ? {
            ...data.preview.group,
            createdAt: new Date(data.preview.group.createdAt),
            updatedAt: new Date(data.preview.group.updatedAt),
          }
        : null,
      rows: data.preview.rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
      })),
    },
    usedBy: data.usedBy,
  };
}

export async function postInternalAdminGroupAction(
  action:
    | "addUserToGroup"
    | "createDynamicUserGroup"
    | "createUserGroup"
    | "deleteDynamicUserGroup"
    | "deleteUserGroup"
    | "removeUserFromGroup"
    | "updateDynamicUserGroup"
    | "updateUserGroup",
  payload: FormData | Record<string, string>,
) {
  const formData = cloneFormData(payload);
  formData.set("action", action);

  await fetchInternalAdminJson("/api/internal/admin/groups/actions", {
    body: formData,
    method: "POST",
  });
}
