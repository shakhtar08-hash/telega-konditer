import { prisma } from "@/db/prisma";
import { loadDynamicUserGroupsOrEmpty } from "@/app/admin/_lib/dynamic-user-groups";
import { matchesDynamicUserGroup, type DynamicGroupEvaluationContext } from "./evaluator";
import { parseDynamicUserGroupDefinition } from "./rule-validator";

type BuildPreviewOptions = {
  skip?: number;
  take?: number;
  now?: Date;
};

type UserPreviewRow = Awaited<ReturnType<typeof loadDynamicGroupCandidateUsers>>[number];

export type DynamicUserPreview = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  createdAt: Date;
  context: DynamicGroupEvaluationContext;
};

export async function loadDynamicUserGroupRecord(groupId: string) {
  const group = await prisma.dynamicUserGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      logicOperator: true,
      conditionsJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!group) {
    return null;
  }

  const definition = parseDynamicUserGroupDefinition({
    logicOperator: group.logicOperator,
    conditions: group.conditionsJson,
  });

  if (!definition) {
    return null;
  }

  return {
    ...group,
    definition,
  };
}

export async function loadDynamicUserGroupOptions() {
  const { groups } = await loadDynamicUserGroupsOrEmpty(() =>
    prisma.dynamicUserGroup.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
  );

  return groups;
}

export async function loadDynamicGroupCandidateUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      promoClaimed: true,
      createdAt: true,
      generatedRecipeContexts: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      usage: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      conversations: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
        },
      },
    },
  });
}

export async function loadDynamicGroupCandidateUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      promoClaimed: true,
      createdAt: true,
      generatedRecipeContexts: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      usage: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      conversations: {
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      },
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
        },
      },
    },
  });
}

export function buildDynamicGroupEvaluationContext(row: UserPreviewRow, now = new Date()) {
  const activityDates = [
    row.generatedRecipeContexts[0]?.createdAt ?? null,
    row.usage[0]?.createdAt ?? null,
    row.conversations[0]?.createdAt ?? null,
  ].filter((value): value is Date => value instanceof Date);

  const lastActivityAt =
    activityDates.length > 0
      ? new Date(Math.max(...activityDates.map((value) => value.getTime())))
      : null;
  const hasActiveTariff = Boolean(row.userTariff && row.userTariff.expiresAt > now);
  const expiresAt = row.userTariff?.expiresAt ?? null;

  return {
    promoClaimed: row.promoClaimed,
    hasActiveTariff,
    tariffExpired: Boolean(expiresAt && expiresAt <= now),
    generationCount: row.generatedRecipeContexts.length,
    daysSinceLastActivity: lastActivityAt ? diffDays(lastActivityAt, now) : null,
    daysSinceSignup: diffDays(row.createdAt, now),
    remainingTokens: row.userTariff?.remainingTokens ?? 0,
  };
}

export async function buildDynamicUserGroupPreview(groupId: string, options: BuildPreviewOptions = {}) {
  const now = options.now ?? new Date();
  const group = await loadDynamicUserGroupRecord(groupId);

  if (!group || group.status !== "active") {
    return {
      group,
      rows: [] as DynamicUserPreview[],
      total: 0,
    };
  }

  const users = await loadDynamicGroupCandidateUsers();
  const matches = users
    .map((row) => {
      const context = buildDynamicGroupEvaluationContext(row, now);

      return matchesDynamicUserGroup(group.definition, context)
        ? [
            {
              id: row.id,
              telegramId: row.telegramId,
              username: row.username,
              name: row.name,
              createdAt: row.createdAt,
              context,
            } satisfies DynamicUserPreview,
          ]
        : [];
    })
    .flat();

  const skip = options.skip ?? 0;
  const take = options.take ?? matches.length;

  return {
    group,
    rows: matches.slice(skip, skip + take),
    total: matches.length,
  };
}

function diffDays(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}
