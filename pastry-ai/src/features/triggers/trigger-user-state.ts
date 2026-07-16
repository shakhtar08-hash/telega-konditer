import { prisma } from "@/db/prisma";
import type { TriggerUserState } from "./trigger-rule-types";

type TriggerUserStateLoaderDeps = {
  countGeneratedRecipes(userId: string): Promise<number>;
  findUser(userId: string): Promise<{
    plan: TriggerUserState["plan"];
    promoClaimed: boolean;
    createdAt: Date;
  }>;
  findUserGroups(userId: string): Promise<
    Array<{
      userGroupId: string;
    }>
  >;
  findUserTariff(userId: string): Promise<{
    expiresAt: Date;
    remainingTokens: number;
  } | null>;
  findLastActivityAt(userId: string): Promise<Date | null>;
};

export function createTriggerUserStateLoader(
  deps: TriggerUserStateLoaderDeps,
) {
  return async function loadTriggerUserState(
    userId: string,
  ): Promise<TriggerUserState> {
    const [user, userTariff, generationCount, memberships, lastActivityAt] = await Promise.all([
      deps.findUser(userId),
      deps.findUserTariff(userId),
      deps.countGeneratedRecipes(userId),
      deps.findUserGroups(userId),
      deps.findLastActivityAt(userId),
    ]);

    const now = new Date();

    return {
      plan: user.plan,
      promoClaimed: user.promoClaimed,
      hasActiveTariff: Boolean(userTariff && userTariff.expiresAt > now),
      generationCount,
      groupIds: memberships.map((membership) => membership.userGroupId),
      remainingTokens: userTariff?.remainingTokens ?? 0,
      tariffExpired: Boolean(userTariff && userTariff.expiresAt <= now),
      createdAt: user.createdAt,
      lastActivityAt,
    };
  };
}

export const loadTriggerUserState = createTriggerUserStateLoader({
  countGeneratedRecipes: (userId) =>
    prisma.generatedRecipeContext.count({ where: { userId } }),
  findUser: (userId) =>
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { plan: true, promoClaimed: true, createdAt: true },
    }),
  findUserGroups: (userId) =>
    prisma.userGroupMember.findMany({
      where: { userId },
      select: { userGroupId: true },
    }),
  findUserTariff: (userId) =>
    prisma.userTariff.findUnique({
      where: { userId },
      select: { expiresAt: true, remainingTokens: true },
    }),
  findLastActivityAt: async (userId) => {
    const [latestUsage, latestConversation, latestRecipe] = await Promise.all([
      prisma.usage.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.conversation.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.generatedRecipeContext.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const timestamps = [
      latestUsage?.createdAt,
      latestConversation?.createdAt,
      latestRecipe?.createdAt,
    ].filter((value): value is Date => Boolean(value));

    return timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
      : null;
  },
});
