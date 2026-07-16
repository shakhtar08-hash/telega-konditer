"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import { prisma } from "@/db/prisma";
import type { TriggerCondition, TriggerRuleRecord } from "@/features/triggers/trigger-rule-types";
import { parseTriggerButtonsFromFormData } from "./trigger-buttons-form";

type TriggerDelayUnit = TriggerRuleRecord["delayUnit"];
type TriggerStatus = TriggerRuleRecord["status"];
const supportedDelayUnits = new Set<TriggerDelayUnit>([
  "now",
  "minutes",
  "hours",
  "days",
]);

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

function finishTriggerMutation() {
  revalidatePath("/admin/triggers");
  redirect("/admin/triggers");
}

export async function createTriggerRule(formData: FormData) {
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

  finishTriggerMutation();
}

export async function updateTriggerRule(formData: FormData) {
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

  finishTriggerMutation();
}

export async function deleteTriggerRule(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  await prisma.triggerRule.delete({
    where: { id },
  });

  finishTriggerMutation();
}
