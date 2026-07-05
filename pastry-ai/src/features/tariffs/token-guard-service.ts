import { UserFacingError } from "@/lib/user-facing-error";

type UserTariffRepository = {
  findByUserId(userId: string): Promise<{
    remainingTokens: number;
    expiresAt: Date;
    tariffPlan: { name: string; slug: string };
  } | null>;
  updateRemainingTokens(userId: string, remainingTokens: number): Promise<unknown>;
};

type TokenUsageRepository = {
  create(data: {
    userId: string;
    feature: string;
    promptSlug?: string | null;
    imagesSent: number;
    tokensSpent: number;
  }): Promise<unknown>;
};

export type TariffState = {
  tariffName: string;
  tariffSlug: string;
  remainingTokens: number;
  expiresAt: Date;
  isExpired: boolean;
};

function isExpired(expiresAt: Date) {
  return expiresAt <= new Date();
}

export function createTokenGuardService(
  userTariffRepository: UserTariffRepository,
  tokenUsageRepository: TokenUsageRepository,
) {
  async function getUserTariffState(userId: string): Promise<TariffState | null> {
    const tariff = await userTariffRepository.findByUserId(userId);
    if (!tariff) return null;
    return {
      tariffName: tariff.tariffPlan.name,
      tariffSlug: tariff.tariffPlan.slug,
      remainingTokens: tariff.remainingTokens,
      expiresAt: tariff.expiresAt,
      isExpired: isExpired(tariff.expiresAt),
    };
  }

  return {
    async ensureSufficientTokens(userId: string, required: number): Promise<void> {
      const tariff = await userTariffRepository.findByUserId(userId);
      if (!tariff || isExpired(tariff.expiresAt)) {
        throw new UserFacingError(
          "Срок действия вашего тарифа истёк. Доступ к генерации фото заблокирован. Купите новый тариф в /menu.",
        );
      }
      if (tariff.remainingTokens < required) {
        throw new UserFacingError(
          `Для этого сценария нужно ${required} токенов. У вас осталось ${tariff.remainingTokens}. не хватает ${required - tariff.remainingTokens}. Купите тариф с бóльшим количеством токенов.`,
        );
      }
    },

    async getAvailablePhotoSlots(userId: string, maxSlots: number): Promise<number> {
      const tariff = await userTariffRepository.findByUserId(userId);
      if (!tariff || isExpired(tariff.expiresAt)) return 0;
      return Math.min(maxSlots, tariff.remainingTokens);
    },

    async chargeTokens(
      userId: string,
      feature: string,
      promptSlug: string | null,
      imagesSent: number,
    ): Promise<void> {
      const tariff = await userTariffRepository.findByUserId(userId);
      if (!tariff) return;
      const newBalance = tariff.remainingTokens - imagesSent;
      await userTariffRepository.updateRemainingTokens(userId, Math.max(0, newBalance));
      await tokenUsageRepository.create({
        userId,
        feature,
        promptSlug,
        imagesSent,
        tokensSpent: imagesSent,
      });
    },

    async getUserTariffState(userId: string): Promise<TariffState | null> {
      return getUserTariffState(userId);
    },
  };
}