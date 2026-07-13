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
export const dynamic = "force-dynamic";

const triggerRuleModel = (prisma as unknown as {
  triggerRule: {
    findMany(args: unknown): Promise<TriggerMessageRecord[]>;
  };
}).triggerRule;

const scheduledMessageModel = prisma.scheduledMessage as unknown as {
  create(args: unknown): Promise<ScheduledMessageRecord>;
  findFirst(args: unknown): Promise<{ id: string } | null>;
  findMany(args: unknown): Promise<ScheduledMessageRecord[]>;
  update(args: unknown): Promise<unknown>;
};

export async function POST(request: Request) {
  const env = loadEnv();
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggerService = createTriggerService({
    findActiveRulesByEvent: async (eventKey) =>
      triggerRuleModel.findMany({
        where: { eventKey, status: "active" },
        orderBy: [{ delayValue: "asc" }, { createdAt: "asc" }],
      }),

    createScheduled: async (data) =>
      scheduledMessageModel.create({ data }),

    findExistingScheduled: async (triggerRuleId, chatId, eventOccurredAt) =>
      scheduledMessageModel.findFirst({
        where: { triggerRuleId, chatId, triggeredAt: eventOccurredAt, sentAt: null },
        select: { id: true },
      }),

    findPendingScheduled: async (limit) =>
      scheduledMessageModel.findMany({
        orderBy: { sendAt: "asc" },
        take: limit,
        where: {
          sentAt: null,
          sendAt: { lte: new Date() },
        },
      }) as Promise<ScheduledMessageRecord[]>,

    markSent: async (id) => {
      await scheduledMessageModel.update({
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
