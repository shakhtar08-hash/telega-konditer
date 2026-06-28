export type UserRecord = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  plan: "FREE" | "PRO" | "TEAM";
  credits: number;
};

export type UpsertTelegramUserInput = {
  telegramId: string;
  username?: string | null;
  name?: string | null;
};

type UserDelegate = {
  upsert(args: {
    where: { telegramId: string };
    update: { username: string | null; name: string | null };
    create: { telegramId: string; username: string | null; name: string | null };
  }): Promise<UserRecord>;
};

export function createUserRepository(userDelegate: UserDelegate) {
  return {
    upsertTelegramUser(input: UpsertTelegramUserInput): Promise<UserRecord> {
      const username = input.username ?? null;
      const name = input.name ?? null;

      return userDelegate.upsert({
        where: { telegramId: input.telegramId },
        update: { username, name },
        create: { telegramId: input.telegramId, username, name },
      });
    },
  };
}
