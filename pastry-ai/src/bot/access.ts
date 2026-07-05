import { planAllowsPromptAccess, type AppPlan } from "@/features/subscriptions/plans";

export type BotSubscriptionAccess = {
  expiresAt: Date | null;
  status: string;
};

export type BotUserAccess = {
  plan: AppPlan;
  subscription: BotSubscriptionAccess | null;
};

export function hasUsableAccess(
  subscription: BotSubscriptionAccess | null,
  now = new Date(),
) {
  return (
    subscription?.status === "active" &&
    (!subscription.expiresAt || subscription.expiresAt > now)
  );
}

export function userPlanHasPromptAccess(user: BotUserAccess, now = new Date()) {
  return planAllowsPromptAccess(user.plan) || hasUsableAccess(user.subscription, now);
}

export async function userHasTokenAccess(userId: string): Promise<boolean> {
  const { prisma } = await import("@/db/prisma");
  const userTariff = await prisma.userTariff.findUnique({
    where: { userId },
    select: { expiresAt: true, remainingTokens: true },
  });
  return userTariff !== null && userTariff.expiresAt > new Date() && userTariff.remainingTokens > 0;
}

export async function userHasPromptAccess(userId: string) {
  const { prisma } = await import("@/db/prisma");
  const user = await prisma.user.findUnique({
    select: {
      plan: true,
      subscription: {
        select: {
          expiresAt: true,
          status: true,
        },
      },
    },
    where: {
      id: userId,
    },
  });

  return user ? userPlanHasPromptAccess(user) : false;
}
