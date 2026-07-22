import { NextResponse } from "next/server";
import { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { Prisma, type ScheduledMessage, type TriggerRule } from "@prisma/client";
import { rejectForAppRole } from "@/lib/app-role";
import { loadEnv } from "@/lib/env";
import {
  type ScheduledMessageRecord,
  type TriggerMessageRecord,
  createTriggerService,
} from "@/features/triggers/trigger-service";
import { sendScenarioStep } from "@/features/triggers/scenario-step-renderer";
import { resolveTelegramPhotoInput } from "@/bot/telegram-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TriggerButton = {
  text?: string;
  type?: string;
  value?: string;
};

type TriggerRuleWithScenario = TriggerRule & {
  scenario?: { startStepId: string | null } | null;
};

function toTriggerRuleRecord(rule: TriggerRuleWithScenario): TriggerMessageRecord {
  const record = {
    ...rule,
    buttons: rule.buttons,
    deliveryType: rule.deliveryType as TriggerMessageRecord["deliveryType"],
    scenarioId: rule.scenarioId,
    startStepId: rule.scenario?.startStepId ?? null,
    conditions: rule.conditions as TriggerMessageRecord["conditions"],
    delayUnit: rule.delayUnit as TriggerMessageRecord["delayUnit"],
    status: rule.status as TriggerMessageRecord["status"],
  } as TriggerMessageRecord & { startStepId: string | null };

  return record;
}

function toScheduledMessageRecord(
  scheduledMessage: ScheduledMessage,
): ScheduledMessageRecord {
  return {
    ...scheduledMessage,
    buttons: scheduledMessage.buttons,
  };
}

function toPrismaJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

function buildReplyMarkup(buttons: unknown) {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    return undefined;
  }

  const keyboard = new InlineKeyboard();
  let hasRows = false;

  for (const button of buttons as TriggerButton[]) {
    if (!button || typeof button.text !== "string" || button.text.trim().length === 0) {
      continue;
    }

    if (button.type === "url" && typeof button.value === "string" && button.value.trim().length > 0) {
      keyboard.url(button.text.trim(), button.value.trim()).row();
      hasRows = true;
      continue;
    }
  }

  return hasRows ? keyboard : undefined;
}

export async function POST(request: Request) {
  const env = loadEnv();
  const roleResponse = rejectForAppRole(
    "/api/cron/process-triggers",
    env.APP_ROLE,
    ["cron"],
  );

  if (roleResponse) {
    return roleResponse;
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/db/prisma");
  const triggerService = createTriggerService({
    findActiveRulesByEvent: async (eventKey) => {
      const rules = await prisma.triggerRule.findMany({
        include: {
          scenario: {
            select: { startStepId: true },
          },
        },
        where: { eventKey, status: "active" },
        orderBy: [{ delayValue: "asc" }, { createdAt: "asc" }],
      });

      return rules.map(toTriggerRuleRecord);
    },

    createScheduled: async (data) =>
      toScheduledMessageRecord(
        await prisma.scheduledMessage.create({
          data: {
            ...data,
            buttons: toPrismaJsonValue(data.buttons),
          },
        }),
      ),

    findExistingScheduled: async (triggerRuleId, chatId, eventOccurredAt) =>
      prisma.scheduledMessage.findFirst({
        where: { triggerRuleId, chatId, triggeredAt: eventOccurredAt, sentAt: null },
        select: { id: true },
      }),

    findPendingScheduled: async (limit) => {
      const pending = await prisma.scheduledMessage.findMany({
        orderBy: { sendAt: "asc" },
        take: limit,
        where: {
          sentAt: null,
          sendAt: { lte: new Date() },
        },
      });

      return pending.map(toScheduledMessageRecord);
    },

    markSent: async (id) => {
      await prisma.scheduledMessage.update({
        data: { sentAt: new Date() },
        where: { id },
      });
    },
  });

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  const sent = await triggerService.processPendingTriggers(
    async (chatId, text, payload) => {
      const replyMarkup = buildReplyMarkup(payload.buttons);

      if (payload.imageUrl) {
        await bot.api.sendPhoto(chatId, resolveTelegramPhotoInput(payload.imageUrl), {
          caption: text,
          reply_markup: replyMarkup,
        });
        return;
      }

      await bot.api.sendMessage(chatId, text, {
        reply_markup: replyMarkup,
      });
    },
    async (chatId, stepId) => sendScenarioStep(bot, chatId, stepId),
  );

  return NextResponse.json({ ok: true, sent });
}
