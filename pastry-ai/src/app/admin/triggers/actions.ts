"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { postInternalAdminTriggerAction } from "@/features/admin/triggers/internal-admin-client";
import {
  performCreateTriggerRule,
  performDeleteTriggerRule,
  performSendTriggerTest,
  performUpdateTriggerRule,
  type TriggerTestSendResult,
} from "@/features/admin/triggers/service";

function finishTriggerMutation() {
  revalidatePath("/admin/triggers");
  redirect("/admin/triggers");
}

export async function createTriggerRule(formData: FormData) {
  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminTriggerAction("createTriggerRule", formData);
  } else {
    await performCreateTriggerRule(formData);
  }

  finishTriggerMutation();
}

export async function updateTriggerRule(formData: FormData) {
  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminTriggerAction("updateTriggerRule", formData);
  } else {
    await performUpdateTriggerRule(formData);
  }

  finishTriggerMutation();
}

export async function deleteTriggerRule(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminTriggerAction("deleteTriggerRule", formData);
  } else {
    await performDeleteTriggerRule(id);
  }

  finishTriggerMutation();
}

export async function sendTriggerTestMessage(
  stateOrFormData: TriggerTestSendResult | FormData,
  maybeFormData?: FormData,
): Promise<TriggerTestSendResult> {
  const formData =
    stateOrFormData instanceof FormData ? stateOrFormData : maybeFormData;

  if (!formData) {
    return {
      message: "Не удалось прочитать данные формы для тестовой отправки.",
      ok: false,
    };
  }

  if (process.env.APP_ROLE === "ingress") {
    return (
      (await postInternalAdminTriggerAction("sendTriggerTest", formData)) ?? {
        message: "Тестовая отправка не удалась.",
        ok: false,
      }
    );
  }

  return performSendTriggerTest(formData);
}
