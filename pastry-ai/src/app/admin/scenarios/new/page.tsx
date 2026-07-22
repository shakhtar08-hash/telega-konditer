import { createScenario } from "../actions";
import { knownBotCommands } from "../known-bot-commands";
import { ScenarioForm, type ScenarioFormValues } from "../scenario-form";

export const dynamic = "force-dynamic";

function buildDefaultScenario(): ScenarioFormValues {
  return {
    description: null,
    id: "",
    name: "",
    startStepId: "step_start",
    status: "draft",
    steps: [
      {
        buttons: [],
        id: "step_start",
        imageUrl: null,
        messageText: "",
        name: "Сообщение 1",
        scenarioId: "new",
        sortOrder: 0,
      },
    ],
  };
}

export default async function NewScenarioPage() {
  return (
    <ScenarioForm
      action={createScenario}
      cancelHref="/admin/scenarios"
      initial={buildDefaultScenario()}
      knownBotCommands={knownBotCommands}
      submitLabel="Создать сценарий"
      title="Новый сценарий"
    />
  );
}
