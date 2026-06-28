import { z } from "zod";
import type {
  UpsertTelegramUserInput,
  UserRecord,
} from "@/db/repositories/user-repository";

const telegramUserSchema = z.object({
  telegramId: z.string().min(1),
  username: z.string().nullish(),
  name: z.string().nullish(),
});

type UserRepository = {
  upsertTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord>;
};

export function createUserService(dependencies: {
  userRepository: UserRepository;
}) {
  return {
    registerTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord> {
      return dependencies.userRepository.upsertTelegramUser(
        telegramUserSchema.parse(input),
      );
    },
  };
}
