import { NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from "@/db/prisma";
import { loadEnv } from "@/lib/env";
import {
  type ScheduledMessageRecord,
  type TriggerMessageRecord,
  createTriggerService,
} from "@/features/triggers/trigger-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const env = loadEnv();

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggerService = createTriggerService({
    findActiveBySlug: async (slug) =>
      prisma.triggerMessage.findFirst({
        where: { slug, active: true },
      }) as Promise<TriggerMessageRecord | null>,

    createScheduled: async (data) =>
      prisma.scheduledMessage.create({ data }) as Promise<ScheduledMessageRecord>,

    findExistingScheduled: async (triggerSlug, chatId) =>
      prisma.scheduledMessage.findFirst({
        where: { triggerSlug, chatId, sentAt: null },
        select: { id: true },
      }),

    findPendingScheduled: async (limit) =>
      prisma.scheduledMessage.findMany({
        orderBy: { sendAt: "asc" },
        take: limit,
        where: {
          sentAt: null,
          sendAt: { lte: new Date() },
        },
      }) as Promise<ScheduledMessageRecord[]>,

    markSent: async (id) => {
      await prisma.scheduledMessage.update({
        data: { sentAt: new Date() },
        where: { id },
      });
    },
  });

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  const sent = await triggerService.processPendingTriggers(
    async (chatId, text) => {
      await bot.api.sendMessage(chatId, text);
    },
  );

  return NextResponse.json({ ok: true, sent });
}