import { prisma } from "@/db/prisma";
import type { TriggerUserState } from "./trigger-rule-types";

type TriggerUserStateLoaderDeps = {
  countGeneratedRecipes(userId: string): Promise<number>;
  findUser(userId: string): Promise<{
    plan: TriggerUserState["plan"];
    promoClaimed: boolean;
  }>;
  findUserGroups(userId: string): Promise<
    Array<{
      userGroupId: string;
    }>
  >;
  findUserTariff(userId: string): Promise<{
    expiresAt: Date;
  } | null>;
};

export function createTriggerUserStateLoader(
  deps: TriggerUserStateLoaderDeps,
) {
  return async function loadTriggerUserState(
    userId: string,
  ): Promise<TriggerUserState> {
    const [user, userTariff, generationCount, memberships] = await Promise.all([
      deps.findUser(userId),
      deps.findUserTariff(userId),
      deps.countGeneratedRecipes(userId),
      deps.findUserGroups(userId),
    ]);

    return {
      plan: user.plan,
      promoClaimed: user.promoClaimed,
      hasActiveTariff: Boolean(userTariff && userTariff.expiresAt > new Date()),
      generationCount,
      groupIds: memberships.map((membership) => membership.userGroupId),
    };
  };
}

export const loadTriggerUserState = createTriggerUserStateLoader({
  countGeneratedRecipes: (userId) =>
    prisma.generatedRecipeContext.count({ where: { userId } }),
  findUser: (userId) =>
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { plan: true, promoClaimed: true },
    }),
  findUserGroups: (userId) =>
    prisma.userGroupMember.findMany({
      where: { userId },
      select: { userGroupId: true },
    }),
  findUserTariff: (userId) =>
    prisma.userTariff.findUnique({
      where: { userId },
      select: { expiresAt: true },
    }),
});
