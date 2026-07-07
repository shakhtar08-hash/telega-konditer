import { z } from "zod";
import type {
  UpsertTelegramUserInput,
  UserRecord,
} from "@/db/repositories/user-repository";
import type { TariffPlanRecord } from "@/db/repositories/tariff-plan-repository";
import type { UserTariffRecord } from "@/db/repositories/user-tariff-repository";

const telegramUserSchema = z.object({
  telegramId: z.string().min(1),
  username: z.string().nullish(),
  name: z.string().nullish(),
});

type UserRepository = {
  upsertTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord>;
};

type TariffPlanRepository = {
  findBySlug(slug: string): Promise<TariffPlanRecord | null>;
};

type UserTariffRepository = {
  findByUserId(userId: string): Promise<UserTariffRecord | null>;
  upsert(
    userId: string,
    data: { tariffPlanId: string; remainingTokens: number; expiresAt: Date },
  ): Promise<UserTariffRecord>;
};

export function createUserService(dependencies: {
  userRepository: UserRepository;
  tariffPlanRepository: TariffPlanRepository;
  userTariffRepository: UserTariffRepository;
}) {
  return {
    async registerTelegramUser(
      input: UpsertTelegramUserInput,
    ): Promise<UserRecord> {
      const user = await dependencies.userRepository.upsertTelegramUser(
        telegramUserSchema.parse(input),
      );

      const existingTariff = await dependencies.userTariffRepository.findByUserId(
        user.id,
      );

      if (!existingTariff) {
        const promoTariff = await dependencies.tariffPlanRepository.findBySlug(
          "promo",
        );

        if (promoTariff) {
          await dependencies.userTariffRepository.upsert(user.id, {
            tariffPlanId: promoTariff.id,
            remainingTokens: promoTariff.tokenAmount,
            expiresAt: getTariffExpiryDate(promoTariff.durationDays),
          });
        }
      }

      return user;
    },
  };
}

function getTariffExpiryDate(durationDays: number) {
  return new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
}
