import { notFound } from "next/navigation";
import { fetchInternalAdminScenarioEditorData } from "@/features/admin/scenarios/internal-admin-client";
import { loadAdminScenarioEditorData } from "@/features/admin/scenarios/service";
import {
  deleteScenario,
  duplicateScenario,
  duplicateScenarioStep,
  updateScenario,
} from "../actions";
import { knownBotCommands } from "../known-bot-commands";
import { ScenarioForm } from "../scenario-form";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ scenarioId: string }> | { scenarioId: string };
}) {
  const { scenarioId } = await params;
  const scenario =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminScenarioEditorData(scenarioId)
      : await loadAdminScenarioEditorData(scenarioId);

  if (!scenario) {
    notFound();
  }

  return (
    <ScenarioForm
      action={updateScenario}
      cancelHref="/admin/scenarios"
      deleteAction={deleteScenario}
      duplicateAction={duplicateScenario}
      duplicateStepAction={duplicateScenarioStep}
      initial={scenario}
      knownBotCommands={knownBotCommands}
      submitLabel="Сохранить изменения"
      title="Редактирование сценария"
    />
  );
}
