export type BotTariffAccess = {
  expiresAt: Date;
};

export function hasActiveTariffAccess(
  tariff: BotTariffAccess | null,
  now = new Date(),
) {
  return tariff !== null && tariff.expiresAt > now;
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
  const userTariff = await prisma.userTariff.findUnique({
    select: {
      expiresAt: true,
      tariffPlan: {
        select: { tokenAmount: true },
      },
    },
    where: {
      userId,
    },
  });

  return (
    userTariff !== null &&
    userTariff.expiresAt > new Date() &&
    (userTariff.tariffPlan?.tokenAmount ?? 0) > 0
  );
}
