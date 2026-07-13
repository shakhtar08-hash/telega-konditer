"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAdminImage } from "@/app/admin/_lib/save-admin-image";
import { prisma } from "@/db/prisma";
import type { TriggerCondition, TriggerRuleRecord } from "@/features/triggers/trigger-rule-types";

type TriggerDelayUnit = TriggerRuleRecord["delayUnit"];
type TriggerStatus = TriggerRuleRecord["status"];

function parseConditions(formData: FormData): TriggerCondition[] {
  const raw = String(formData.get("conditions") ?? "[]");

  try {
    const parsed = JSON.parse(raw) as TriggerCondition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseDelay(formData: FormData) {
  const delayUnit = String(formData.get("delayUnit") ?? "now") as TriggerDelayUnit;
  const delayValue = Number(formData.get("delayValue") ?? 0);

  return {
    delayUnit,
    delayValue: Number.isFinite(delayValue) ? delayValue : 0,
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
  const imageUrl = await saveAdminImage({
    entity: "triggers",
    existingValue: null,
    file: (formData.get("imageFile") as File | null) ?? null,
    manualValue: String(formData.get("imageUrl") ?? ""),
  });
  const conditions = parseConditions(formData);

  if (!name || !eventKey || !messageText) {
    return;
  }

  await prisma.triggerRule.create({
    data: {
      buttons: [],
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
  const imageUrl = await saveAdminImage({
    entity: "triggers",
    existingValue: null,
    file: (formData.get("imageFile") as File | null) ?? null,
    manualValue: String(formData.get("imageUrl") ?? ""),
  });
  const conditions = parseConditions(formData);

  if (!id || !name || !eventKey || !messageText) {
    return;
  }

  await prisma.triggerRule.update({
    data: {
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
