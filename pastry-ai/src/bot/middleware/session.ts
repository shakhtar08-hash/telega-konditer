import { session, type StorageAdapter } from "grammy";
import type { Prisma } from "@prisma/client";
import type { BotSession, PastryBotContext } from "../context";

type SessionDelegate = {
  deleteMany(args: { where: { key: string } }): Promise<unknown>;
  findUnique(args: {
    where: { key: string };
  }): Promise<{ data: Prisma.JsonValue } | null>;
  upsert(args: {
    where: { key: string };
    update: { data: Prisma.InputJsonValue };
    create: { key: string; data: Prisma.InputJsonValue };
  }): Promise<unknown>;
};

export function createPrismaSessionStorage(
  sessionDelegate: SessionDelegate,
): StorageAdapter<BotSession> {
  return {
    async read(key) {
      const sessionRecord = await sessionDelegate.findUnique({ where: { key } });

      return sessionRecord?.data as BotSession | undefined;
    },

    async write(key, value) {
      const data = value as Prisma.InputJsonObject;

      await sessionDelegate.upsert({
        where: { key },
        update: { data },
        create: { key, data },
      });
    },

    async delete(key) {
      await sessionDelegate.deleteMany({ where: { key } });
    },
  };
}

export function sessionMiddleware(storage?: StorageAdapter<BotSession>) {
  return session<BotSession, PastryBotContext>({
    initial: () => ({}),
    storage,
  });
}
