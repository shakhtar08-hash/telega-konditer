type UserLookupDelegate = {
  findUnique(args: {
    where: { telegramId: string };
    select: { id: true };
  }): Promise<{ id: string } | null>;
};

export async function resolveUserIdByTelegramId(
  delegate: UserLookupDelegate,
  telegramId: string,
) {
  if (!telegramId) {
    return null;
  }

  const user = await delegate.findUnique({
    where: { telegramId },
    select: { id: true },
  });

  return user?.id ?? null;
}
