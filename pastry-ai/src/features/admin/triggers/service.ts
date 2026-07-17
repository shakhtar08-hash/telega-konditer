import { readFile } from "node:fs/promises";
import path from "node:path";
import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import { loadDynamicUserGroupsOrEmpty } from "@/app/admin/_lib/dynamic-user-groups";
import { loadUserGroupsOrEmpty } from "@/app/admin/_lib/user-groups";
import { parseTriggerButtonsFromFormData } from "@/app/admin/triggers/trigger-buttons-form";
import { prisma } from "@/db/prisma";
import { loadEnv } from "@/lib/env";
import { assertAllowedImageUrl } from "@/lib/image-url-validator";
import type { TriggerCondition, TriggerRuleRecord } from "@/features/triggers/trigger-rule-types";

type TriggerDelayUnit = TriggerRuleRecord["delayUnit"];
type TriggerStatus = TriggerRuleRecord["status"];

const supportedDelayUnits = new Set<TriggerDelayUnit>([
  "now",
  "minutes",
  "hours",
  "days",
]);

const allowedTelegramHtmlTags = new Set([
  "a",
  "b",
  "blockquote",
  "code",
  "i",
  "pre",
  "s",
]);

export type TriggerTestSendResult = {
  message: string;
  ok: boolean;
};

export type AdminTriggerListRuleRecord = Pick<
  TriggerRuleRecord,
  | "conditions"
  | "delayUnit"
  | "delayValue"
  | "eventKey"
  | "id"
  | "name"
  | "status"
> & {
  createdAt: Date;
  updatedAt: Date;
};

export type AdminTriggerEditorRuleRecord = Pick<
  TriggerRuleRecord,
  | "buttons"
  | "conditions"
  | "delayUnit"
  | "delayValue"
  | "eventKey"
  | "id"
  | "imageUrl"
  | "messageText"
  | "name"
  | "status"
>;

export type AdminTriggerUserGroupRecord = {
  id: string;
  name: string;
};

export type AdminTriggerDynamicUserGroupRecord = {
  id: string;
  name: string;
  status: "active" | "disabled";
};

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeCondition(input: unknown): TriggerCondition | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;

  switch (candidate.field) {
    case "promoClaimed":
      return candidate.operator === "is"
        ? {
            field: "promoClaimed",
            operator: "is",
            value: toBoolean(candidate.value),
          }
        : null;
    case "hasActiveTariff":
      return candidate.operator === "is"
        ? {
            field: "hasActiveTariff",
            operator: "is",
            value: toBoolean(candidate.value),
          }
        : null;
    case "generationCount":
      return candidate.operator === "equals" || candidate.operator === "gte"
        ? {
            field: "generationCount",
            operator: candidate.operator,
            value: toNumber(candidate.value),
          }
        : null;
    case "userGroupId":
      return candidate.operator === "isMember"
        ? {
            field: "userGroupId",
            operator: "isMember",
            value: String(candidate.value ?? "").trim(),
          }
        : null;
    case "dynamicUserGroupId":
      return candidate.operator === "matches"
        ? {
            field: "dynamicUserGroupId",
            operator: "matches",
            value: String(candidate.value ?? "").trim(),
          }
        : null;
    default:
      return null;
  }
}

function parseConditions(formData: FormData): TriggerCondition[] {
  const raw = String(formData.get("conditions") ?? "[]");

  try {
    const parsed = JSON.parse(raw) as TriggerCondition[];
    return Array.isArray(parsed)
      ? parsed
          .map((condition) => normalizeCondition(condition))
          .filter((condition): condition is TriggerCondition => condition !== null)
      : [];
  } catch {
    return [];
  }
}

function parseDelay(formData: FormData) {
  const rawDelayUnit = String(formData.get("delayUnit") ?? "now").trim();
  const delayUnit = supportedDelayUnits.has(rawDelayUnit as TriggerDelayUnit)
    ? (rawDelayUnit as TriggerDelayUnit)
    : "now";
  const rawDelayValue = Number(formData.get("delayValue") ?? 0);
  const normalizedDelayValue = Number.isFinite(rawDelayValue)
    ? Math.max(0, rawDelayValue)
    : 0;

  return {
    delayUnit,
    delayValue: delayUnit === "now" ? 0 : normalizedDelayValue,
  };
}

function parseStatus(formData: FormData): TriggerStatus {
  const value = String(formData.get("status") ?? "draft").trim();
  return value === "active" || value === "disabled" ? value : "draft";
}

function validateTelegramHtmlSubset(text: string): string | null {
  const tagPattern = /<\/?([a-z]+)([^>]*)>/gi;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(text)) !== null) {
    const [fullMatch, rawTagName, rawAttributes] = match;
    const tagName = rawTagName.toLowerCase();
    const isClosing = fullMatch.startsWith("</");
    const attributes = rawAttributes.trim();

    if (!allowedTelegramHtmlTags.has(tagName)) {
      return `Тег <${tagName}> не поддерживается в Telegram HTML.`;
    }

    if (isClosing) {
      const expected = stack.pop();

      if (expected !== tagName) {
        return "HTML-разметка содержит неверно вложенные или незакрытые теги.";
      }

      continue;
    }

    if (tagName === "a") {
      if (!/^href="https?:\/\/[^"]+"$/.test(attributes)) {
        return 'Ссылка должна использовать тег <a href="https://...">.';
      }
    } else if (attributes.length > 0) {
      return `Тег <${tagName}> не должен содержать дополнительные атрибуты.`;
    }

    stack.push(tagName);
  }

  const strippedKnownTags = text.replace(tagPattern, "");
  if (/[<>]/.test(strippedKnownTags)) {
    return "HTML-разметка содержит недопустимые символы или незавершённые теги.";
  }

  if (stack.length > 0) {
    return "HTML-разметка содержит незакрытые теги.";
  }

  return null;
}

function buildTelegramInlineKeyboard(
  buttons: ReturnType<typeof parseTriggerButtonsFromFormData>,
) {
  if (buttons.length === 0) {
    return undefined;
  }

  return {
    inline_keyboard: buttons.map((button) => [{ text: button.text, url: button.value }]),
  };
}

async function resolveTriggerTestImage(formData: FormData): Promise<
  | { kind: "file"; file: File }
  | { kind: "local"; path: string }
  | { kind: "remote"; url: string }
  | null
> {
  const imageFile = (formData.get("imageFile") as File | null) ?? null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();

  if (imageFile && imageFile.size > 0) {
    return { kind: "file", file: imageFile };
  }

  if (!imageUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    assertAllowedImageUrl(imageUrl, "trigger test send");
    return { kind: "remote", url: imageUrl };
  }

  if (imageUrl.startsWith("/")) {
    return { kind: "local", path: imageUrl };
  }

  return null;
}

async function sendTelegramJson(method: string, payload: Record<string, unknown>) {
  const env = loadEnv();
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  const data = (await response.json().catch(() => null)) as
    | { description?: string; ok?: boolean }
    | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.description ?? `Telegram ${method} failed`);
  }
}

async function sendTelegramPhotoMultipart(input: {
  chatId: string;
  image: NonNullable<Awaited<ReturnType<typeof resolveTriggerTestImage>>>;
  messageText: string;
  replyMarkup?: ReturnType<typeof buildTelegramInlineKeyboard>;
}) {
  const env = loadEnv();
  const body = new FormData();

  body.set("chat_id", input.chatId);
  body.set("caption", input.messageText);
  body.set("parse_mode", "HTML");

  if (input.replyMarkup) {
    body.set("reply_markup", JSON.stringify(input.replyMarkup));
  }

  if (input.image.kind === "file") {
    body.set("photo", input.image.file);
  } else if (input.image.kind === "remote") {
    body.set("photo", input.image.url);
  } else {
    const relativePath = input.image.path.replace(/^\/+/, "");
    const publicRoot = path.resolve(process.cwd(), "public");
    const absolutePath = path.resolve(publicRoot, relativePath);

    if (!absolutePath.startsWith(publicRoot)) {
      throw new Error("Некорректный путь к локальному изображению.");
    }

    const bytes = await readFile(absolutePath);
    const file = new File([new Uint8Array(bytes)], path.basename(absolutePath), {
      type: "image/png",
    });
    body.set("photo", file);
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
    {
      body,
      method: "POST",
    },
  );
  const data = (await response.json().catch(() => null)) as
    | { description?: string; ok?: boolean }
    | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.description ?? "Telegram sendPhoto failed");
  }
}

export async function loadAdminTriggersPageData(): Promise<{
  groups: AdminTriggerUserGroupRecord[];
  rules: AdminTriggerListRuleRecord[];
  userGroupsUnavailable: boolean;
}> {
  const [rules, userGroupsResult] = await Promise.all([
    prisma.triggerRule.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        conditions: true,
        createdAt: true,
        delayUnit: true,
        delayValue: true,
        eventKey: true,
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    }) as Promise<AdminTriggerListRuleRecord[]>,
    loadUserGroupsOrEmpty(() =>
      prisma.userGroup.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }) as Promise<AdminTriggerUserGroupRecord[]>,
    ),
  ]);

  return {
    groups: userGroupsResult.groups,
    rules,
    userGroupsUnavailable: userGroupsResult.unavailable,
  };
}

export async function loadAdminTriggerEditorData(
  triggerId?: string,
): Promise<{
  dynamicGroups: AdminTriggerDynamicUserGroupRecord[];
  dynamicGroupsUnavailable: boolean;
  rule: AdminTriggerEditorRuleRecord | null;
  userGroups: AdminTriggerUserGroupRecord[];
}> {
  const [rule, userGroups, dynamicGroupsResult] = await Promise.all([
    triggerId
      ? (prisma.triggerRule.findUnique({
          where: { id: triggerId },
          select: {
            buttons: true,
            conditions: true,
            delayUnit: true,
            delayValue: true,
            eventKey: true,
            id: true,
            imageUrl: true,
            messageText: true,
            name: true,
            status: true,
          },
        }) as Promise<AdminTriggerEditorRuleRecord | null>)
      : Promise.resolve(null),
    prisma.userGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }) as Promise<AdminTriggerUserGroupRecord[]>,
    loadDynamicUserGroupsOrEmpty(() =>
      prisma.dynamicUserGroup.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      }) as Promise<AdminTriggerDynamicUserGroupRecord[]>,
    ),
  ]);

  return {
    dynamicGroups: dynamicGroupsResult.groups,
    dynamicGroupsUnavailable: dynamicGroupsResult.unavailable,
    rule,
    userGroups,
  };
}

export async function performCreateTriggerRule(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const eventKey = String(formData.get("eventKey") ?? "").trim();
  const { delayValue, delayUnit } = parseDelay(formData);
  const messageText = String(formData.get("messageText") ?? "").trim();
  const conditions = parseConditions(formData);
  const buttons = parseTriggerButtonsFromFormData(formData);

  if (!name || !eventKey || !messageText) {
    return;
  }

  const imageUrl = await saveAdminImage({
    entity: "triggers",
    existingValue: null,
    file: (formData.get("imageFile") as File | null) ?? null,
    manualValue: String(formData.get("imageUrl") ?? ""),
  });

  await prisma.triggerRule.create({
    data: {
      buttons,
      conditions,
      delayUnit,
      delayValue,
      eventKey,
      imageUrl,
      messageText,
      name,
      status: "draft",
    },
  });
}

export async function performUpdateTriggerRule(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const eventKey = String(formData.get("eventKey") ?? "").trim();
  const { delayValue, delayUnit } = parseDelay(formData);
  const status = parseStatus(formData);
  const messageText = String(formData.get("messageText") ?? "").trim();
  const conditions = parseConditions(formData);
  const buttons = parseTriggerButtonsFromFormData(formData);

  if (!id || !name || !eventKey || !messageText) {
    return;
  }

  const imageUrl = await saveAdminImage({
    entity: "triggers",
    existingValue: null,
    file: (formData.get("imageFile") as File | null) ?? null,
    manualValue: String(formData.get("imageUrl") ?? ""),
  });

  await prisma.triggerRule.update({
    data: {
      buttons,
      conditions,
      delayUnit,
      delayValue,
      eventKey,
      imageUrl,
      messageText,
      name,
      status,
    },
    where: { id },
  });
}

export async function performDeleteTriggerRule(id: string) {
  if (!id) {
    return;
  }

  await prisma.triggerRule.delete({
    where: { id },
  });
}

export async function performSendTriggerTest(
  formData: FormData,
): Promise<TriggerTestSendResult> {
  const messageText = String(formData.get("messageText") ?? "").trim();
  const buttons = parseTriggerButtonsFromFormData(formData);

  if (!messageText) {
    return {
      message: "Введите текст сообщения для тестовой отправки.",
      ok: false,
    };
  }

  const htmlError = validateTelegramHtmlSubset(messageText);

  if (htmlError) {
    return {
      message: htmlError,
      ok: false,
    };
  }

  const adminsGroup = await prisma.userGroup.findFirst({
    select: {
      id: true,
      memberships: {
        select: {
          user: {
            select: {
              telegramId: true,
            },
          },
        },
      },
      name: true,
    },
    where: { name: "Админы" },
  });

  if (!adminsGroup) {
    return {
      message: "Группа «Админы» не найдена.",
      ok: false,
    };
  }

  const telegramIds = [
    ...new Set(
      adminsGroup.memberships
        .map((membership) => membership.user.telegramId?.trim())
        .filter((telegramId): telegramId is string => Boolean(telegramId)),
    ),
  ];

  if (telegramIds.length === 0) {
    return {
      message: "В группе «Админы» нет Telegram-получателей.",
      ok: false,
    };
  }

  const replyMarkup = buildTelegramInlineKeyboard(buttons);
  const image = await resolveTriggerTestImage(formData);

  try {
    for (const telegramId of telegramIds) {
      if (image) {
        await sendTelegramPhotoMultipart({
          chatId: telegramId,
          image,
          messageText,
          replyMarkup,
        });
      } else {
        await sendTelegramJson("sendMessage", {
          chat_id: telegramId,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
          text: messageText,
        });
      }
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? `Тестовая отправка не удалась: ${error.message}`
          : "Тестовая отправка не удалась.",
      ok: false,
    };
  }

  return {
    message: `Тестовое сообщение отправлено: ${telegramIds.length}`,
    ok: true,
  };
}
