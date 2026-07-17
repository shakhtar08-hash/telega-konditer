import { prisma } from "@/db/prisma";
import { loadDynamicUserGroupsOrEmpty } from "@/app/admin/_lib/dynamic-user-groups";
import { loadUserGroupsOrEmpty } from "@/app/admin/_lib/user-groups";
import { buildDynamicUserGroupPreview } from "@/features/dynamic-user-groups/query";
import { countDynamicUserGroupMatches } from "@/features/dynamic-user-groups/service";
import { parseDynamicUserGroupDefinition } from "@/features/dynamic-user-groups/rule-validator";

export type AdminUserGroupListRecord = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  membersCount: number;
};

export type AdminUserGroupDetailRecord = {
  group: {
    id: string;
    name: string;
    description: string | null;
    updatedAt: Date;
  };
  members: Array<{
    createdAt: Date;
    userId: string;
    user: {
      id: string;
      telegramId: string;
      username: string | null;
      name: string | null;
    };
  }>;
  candidateUsers: Array<{
    id: string;
    telegramId: string;
    username: string | null;
    name: string | null;
  }>;
};

export type AdminDynamicGroupListRecord = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  logicOperator: string;
  conditionsJson: unknown;
  updatedAt: Date;
  previewCount: number;
};

function readTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readDynamicGroupStatus(formData: FormData) {
  return readTrimmedString(formData, "status") === "disabled" ? "disabled" : "active";
}

function readDynamicGroupDefinition(formData: FormData) {
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

export async function loadAdminUserGroupsPageData(): Promise<{
  groups: AdminUserGroupListRecord[];
  unavailable: boolean;
}> {
  const { groups, unavailable } = await loadUserGroupsOrEmpty(() =>
    prisma.userGroup.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        _count: { select: { memberships: true } },
      },
    }),
  );

  return {
    groups: groups.map((group) => ({
      description: group.description,
      id: group.id,
      membersCount: group._count.memberships,
      name: group.name,
      updatedAt: group.updatedAt,
    })),
    unavailable,
  };
}

export async function loadAdminUserGroupDetailPageData(
  groupId: string,
  search = "",
): Promise<AdminUserGroupDetailRecord> {
  const group = await prisma.userGroup.findUniqueOrThrow({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
    },
  });

  const members = await prisma.userGroupMember.findMany({
    where: { userGroupId: group.id },
    include: {
      user: {
        select: {
          id: true,
          telegramId: true,
          username: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const memberIds = members.map((member) => member.userId);
  const candidateUsers = await prisma.user.findMany({
    where: {
      ...(memberIds.length > 0 ? { id: { notIn: memberIds } } : {}),
      ...(search
        ? {
            OR: [
              { telegramId: { contains: search } },
              { username: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
    },
    take: 20,
  });

  return {
    candidateUsers,
    group,
    members,
  };
}

export async function loadAdminDynamicGroupsPageData(): Promise<{
  groups: AdminDynamicGroupListRecord[];
  unavailable: boolean;
}> {
  const { groups, unavailable } = await loadDynamicUserGroupsOrEmpty(() =>
    prisma.dynamicUserGroup.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        logicOperator: true,
        conditionsJson: true,
        updatedAt: true,
      },
    }),
  );

  const previewCounts = await Promise.all(
    groups.map(async (group) => [group.id, await countDynamicUserGroupMatches(group.id)] as const),
  );
  const previewCountMap = new Map(previewCounts);

  return {
    groups: groups.map((group) => ({
      conditionsJson: group.conditionsJson,
      description: group.description,
      id: group.id,
      logicOperator: group.logicOperator,
      name: group.name,
      previewCount: previewCountMap.get(group.id) ?? 0,
      status: group.status,
      updatedAt: group.updatedAt,
    })),
    unavailable,
  };
}

export async function loadAdminDynamicGroupDetailPageData(groupId: string) {
  const preview = await buildDynamicUserGroupPreview(groupId);

  const triggerRules = await prisma.triggerRule.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      conditions: true,
    },
  });

  const usedBy = triggerRules.filter((rule) =>
    Array.isArray(rule.conditions)
      ? rule.conditions.some(
          (condition) =>
            typeof condition === "object" &&
            condition !== null &&
            "field" in condition &&
            "value" in condition &&
            (condition as { field?: unknown }).field === "dynamicUserGroupId" &&
            (condition as { value?: unknown }).value === preview.group?.id,
        )
      : false,
  );

  return {
    preview,
    usedBy,
  };
}

export async function performCreateUserGroup(input: {
  name: string;
  description: string;
}) {
  if (!input.name) {
    return;
  }

  await prisma.userGroup.create({
    data: {
      description: input.description || null,
      name: input.name,
    },
  });
}

export async function performUpdateUserGroup(input: {
  id: string;
  name: string;
  description: string;
}) {
  if (!input.id || !input.name) {
    return;
  }

  await prisma.userGroup.update({
    data: {
      description: input.description || null,
      name: input.name,
    },
    where: { id: input.id },
  });
}

export async function performDeleteUserGroup(groupId: string) {
  if (!groupId) {
    return;
  }

  await prisma.userGroup.delete({
    where: { id: groupId },
  });
}

export async function performAddUserToGroup(userId: string, userGroupId: string) {
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
}

export async function performRemoveUserFromGroup(userId: string, userGroupId: string) {
  if (!userId || !userGroupId) {
    return;
  }

  await prisma.userGroupMember.deleteMany({
    where: { userGroupId, userId },
  });
}

export async function performCreateDynamicUserGroup(formData: FormData) {
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");
  const definition = readDynamicGroupDefinition(formData);

  if (!name || !definition) {
    return;
  }

  await prisma.dynamicUserGroup.create({
    data: {
      conditionsJson: definition.conditions,
      description: description || null,
      logicOperator: definition.logicOperator,
      name,
      status: readDynamicGroupStatus(formData),
    },
  });
}

export async function performUpdateDynamicUserGroup(formData: FormData) {
  const id = readTrimmedString(formData, "id");
  const name = readTrimmedString(formData, "name");
  const description = readTrimmedString(formData, "description");
  const definition = readDynamicGroupDefinition(formData);

  if (!id || !name || !definition) {
    return;
  }

  await prisma.dynamicUserGroup.update({
    where: { id },
    data: {
      conditionsJson: definition.conditions,
      description: description || null,
      logicOperator: definition.logicOperator,
      name,
      status: readDynamicGroupStatus(formData),
    },
  });
}

export async function performDeleteDynamicUserGroup(groupId: string) {
  if (!groupId) {
    return;
  }

  await prisma.dynamicUserGroup.delete({
    where: { id: groupId },
  });
}
