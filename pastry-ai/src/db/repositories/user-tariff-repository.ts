export type UserTariffRecord = {
  id: string;
  userId: string;
  tariffPlanId: string;
  remainingTokens: number;
  startedAt: Date;
  expiresAt: Date;
  tariffPlan: { name: string; slug: string };
};

type UserTariffDelegate = {
  findUnique(args: {
    where: { userId: string };
    include?: { tariffPlan: { select: { name: boolean; slug: boolean } } };
  }): Promise<UserTariffRecord | null>;
  upsert(args: {
    where: { userId: string };
    update: {
      tariffPlanId: string;
      remainingTokens: number;
      startedAt: Date;
      expiresAt: Date;
    };
    create: {
      userId: string;
      tariffPlanId: string;
      remainingTokens: number;
      startedAt: Date;
      expiresAt: Date;
    };
  }): Promise<UserTariffRecord>;
  update(args: {
    where: { userId: string };
    data: { remainingTokens?: number };
  }): Promise<UserTariffRecord>;
};

export function createUserTariffRepository(delegate: UserTariffDelegate) {
  return {
    findByUserId(userId: string): Promise<UserTariffRecord | null> {
      return delegate.findUnique({
        where: { userId },
        include: { tariffPlan: { select: { name: true, slug: true } } },
      });
    },
    upsert(
      userId: string,
      data: { tariffPlanId: string; remainingTokens: number; expiresAt: Date },
    ): Promise<UserTariffRecord> {
      return delegate.upsert({
        where: { userId },
        update: {
          tariffPlanId: data.tariffPlanId,
          remainingTokens: data.remainingTokens,
          startedAt: new Date(),
          expiresAt: data.expiresAt,
        },
        create: {
          userId,
          tariffPlanId: data.tariffPlanId,
          remainingTokens: data.remainingTokens,
          startedAt: new Date(),
          expiresAt: data.expiresAt,
        },
      });
    },
    updateRemainingTokens(userId: string, remainingTokens: number): Promise<UserTariffRecord> {
      return delegate.update({
        where: { userId },
        data: { remainingTokens },
      });
    },
  };
}