import { prisma } from "@/db/prisma";
import { buildDynamicUserGroupPreview } from "@/features/dynamic-user-groups/query";
import {
  listDynamicUserGroupOptions,
  listMatchingDynamicUserGroupsForUser,
} from "@/features/dynamic-user-groups/service";
import { parseMoscowDateTimeLocalValue } from "@/lib/moscow-time";

export type AdminUserTariffRecord = {
  expiresAt: Date;
  remainingTokens: number;
  tariffPlan: {
    id: string;
    name: string;
    slug: string;
  };
} | null;

export type AdminUserListRecord = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  createdAt: Date;
  userTariff: AdminUserTariffRecord;
};

export type AdminUserDetailRecord = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  promoClaimed: boolean;
  createdAt: Date;
  userTariff: AdminUserTariffRecord;
  groupMemberships: Array<{
    createdAt: Date;
    userGroupId: string;
    userGroup: {
      id: string;
      name: string;
    };
  }>;
};

export type AdminTariffPlanRecord = {
  id: string;
  name: string;
  slug: string;
};

export type AdminUserGroupRecord = {
  id: string;
  name: string;
};

function getDefaultTariffExpiryDate(durationDays: number) {
  return new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
}

async function loadLatestUsers(): Promise<AdminUserListRecord[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      createdAt: true,
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
          tariffPlan: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    take: 100,
  });
}

async function loadUsersByIds(userIds: string[]): Promise<AdminUserListRecord[]> {
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      createdAt: true,
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
          tariffPlan: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return userIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is AdminUserListRecord => Boolean(user));
}

export async function loadAdminUsersPageData(dynamicGroupId = "") {
  const [dynamicGroupOptions, dynamicPreview, tariffPlans] = await Promise.all([
    listDynamicUserGroupOptions(),
    dynamicGroupId
      ? buildDynamicUserGroupPreview(dynamicGroupId, {
          take: 100,
        })
      : null,
    prisma.tariffPlan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  const users = dynamicPreview
    ? await loadUsersByIds(dynamicPreview.rows.map((row) => row.id))
    : await loadLatestUsers();

  return {
    dynamicGroupOptions,
    tariffPlans,
    users,
  };
}

export async function loadAdminUserDetailPageData(userId: string) {
  const [user, groups, tariffPlans, matchingDynamicGroups] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        userTariff: {
          include: {
            tariffPlan: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        groupMemberships: {
          include: {
            userGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }) as Promise<AdminUserDetailRecord>,
    prisma.userGroup.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }) as Promise<AdminUserGroupRecord[]>,
    prisma.tariffPlan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }) as Promise<AdminTariffPlanRecord[]>,
    listMatchingDynamicUserGroupsForUser(userId),
  ]);

  return {
    groups,
    matchingDynamicGroups,
    tariffPlans,
    user,
  };
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

export async function performUpdateUserTariff(input: {
  expiresAtValue: string;
  tariffPlanId: string;
  tokensValue: string;
  userId: string;
}) {
  const id = input.userId.trim();
  const tariffPlanId = input.tariffPlanId.trim();
  const expiresAtValue = input.expiresAtValue.trim();
  const tokensValue = input.tokensValue.trim();

  if (!id) {
    return;
  }

  if (!tariffPlanId) {
    await prisma.userTariff.deleteMany({
      where: { userId: id },
    });
    return;
  }

  const tariffPlan = await prisma.tariffPlan.findUnique({
    where: { id: tariffPlanId },
    select: {
      durationDays: true,
      id: true,
      tokenAmount: true,
    },
  });

  if (!tariffPlan) {
    return;
  }

  const remainingTokens =
    tokensValue === "" ? tariffPlan.tokenAmount : Number(tokensValue);
  const expiresAt =
    expiresAtValue === ""
      ? getDefaultTariffExpiryDate(tariffPlan.durationDays)
      : parseMoscowDateTimeLocalValue(expiresAtValue);

  if (
    !Number.isFinite(remainingTokens) ||
    remainingTokens < 0 ||
    expiresAt === null ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return;
  }

  const existingTariff = await prisma.userTariff.findUnique({
    where: { userId: id },
    select: { id: true },
  });

  if (existingTariff) {
    await prisma.userTariff.update({
      where: { userId: id },
      data: {
        expiresAt,
        remainingTokens,
        tariffPlanId,
      },
    });
    return;
  }

  await prisma.userTariff.create({
    data: {
      expiresAt,
      remainingTokens,
      startedAt: new Date(),
      tariffPlanId,
      userId: id,
    },
  });
}

export async function performDeleteUser(userId: string) {
  const id = userId.trim();
  if (!id) {
    return;
  }

  await prisma.$transaction([
    prisma.userTariff.deleteMany({ where: { userId: id } }),
    prisma.userGroupMember.deleteMany({ where: { userId: id } }),
    prisma.tokenUsage.deleteMany({ where: { userId: id } }),
    prisma.usage.deleteMany({ where: { userId: id } }),
    prisma.generatedRecipeContext.deleteMany({ where: { userId: id } }),
    prisma.conversation.deleteMany({ where: { userId: id } }),
    prisma.payment.deleteMany({ where: { userId: id } }),
    prisma.subscription.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
}
