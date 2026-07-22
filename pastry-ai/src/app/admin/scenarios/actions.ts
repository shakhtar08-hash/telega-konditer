"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { postInternalAdminScenarioAction } from "@/features/admin/scenarios/internal-admin-client";
import {
  performCreateScenario,
  performDeleteScenario,
  performDeleteScenarioStep,
  performDuplicateScenario,
  performDuplicateScenarioStep,
  performUpdateScenario,
} from "@/features/admin/scenarios/service";

function finishScenarioListMutation() {
  revalidatePath("/admin/scenarios");
  redirect("/admin/scenarios");
}

function revalidateScenario(id: string) {
  revalidatePath("/admin/scenarios");
  revalidatePath(`/admin/scenarios/${id}`);
}

export async function createScenario(formData: FormData) {
  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminScenarioAction("createScenario", formData);
  } else {
    await performCreateScenario(formData);
  }

  finishScenarioListMutation();
}

export async function updateScenario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminScenarioAction("updateScenario", formData);
  } else {
    await performUpdateScenario(formData);
  }

  if (id) {
    revalidateScenario(id);
  }
  redirect(id ? `/admin/scenarios/${id}` : "/admin/scenarios");
}

export async function deleteScenario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminScenarioAction("deleteScenario", formData);
  } else {
    await performDeleteScenario(id);
  }

  finishScenarioListMutation();
}

export async function duplicateScenario(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const result =
    process.env.APP_ROLE === "ingress"
      ? await postInternalAdminScenarioAction("duplicateScenario", formData)
      : { id: await performDuplicateScenario(id) };

  revalidatePath("/admin/scenarios");
  redirect(result?.id ? `/admin/scenarios/${result.id}` : "/admin/scenarios");
}

export async function duplicateScenarioStep(formData: FormData) {
  const scenarioId = String(formData.get("id") ?? "").trim();
  const stepId = String(formData.get("stepId") ?? "").trim();

  if (!scenarioId || !stepId) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminScenarioAction("duplicateScenarioStep", formData);
  } else {
    await performDuplicateScenarioStep(stepId);
  }

  revalidateScenario(scenarioId);
  redirect(`/admin/scenarios/${scenarioId}`);
}

export async function deleteScenarioStep(formData: FormData) {
  const scenarioId = String(formData.get("id") ?? "").trim();
  const stepId = String(formData.get("stepId") ?? "").trim();

  if (!scenarioId || !stepId) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminScenarioAction("deleteScenarioStep", formData);
  } else {
    await performDeleteScenarioStep(stepId);
  }

  revalidateScenario(scenarioId);
  redirect(`/admin/scenarios/${scenarioId}`);
}
