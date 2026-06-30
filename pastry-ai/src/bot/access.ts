export type BotSubscriptionAccess = {
  expiresAt: Date | null;
  status: string;
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

export async function userHasPromptAccess(userId: string) {
  const { prisma } = await import("@/db/prisma");
  const subscription = await prisma.subscription.findUnique({
    select: {
      expiresAt: true,
      status: true,
    },
    where: {
      userId,
    },
  });

  return hasUsableAccess(subscription);
}
