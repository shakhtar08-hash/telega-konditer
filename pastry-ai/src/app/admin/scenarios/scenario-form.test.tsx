import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScenarioForm, type ScenarioFormValues } from "./scenario-form";

function buildInitialScenario(): ScenarioFormValues {
  return {
    description: "Scenario for returning users",
    id: "scenario_1",
    name: "Promo scenario",
    startStepId: "step_1",
    status: "draft",
    steps: [
      {
        buttons: [
          {
            actionType: "SCENARIO_STEP",
            actionValue: "step_2",
            id: "button_1",
            sortOrder: 0,
            stepId: "step_1",
            text: "Next",
            transitionMode: "REPLACE_CURRENT",
          },
        ],
        id: "step_1",
        imageUrl: null,
        messageText: "Hello",
        name: "Start",
        scenarioId: "scenario_1",
        sortOrder: 0,
      },
      {
        buttons: [],
        id: "step_2",
        imageUrl: null,
        messageText: "Second message",
        name: "Details",
        scenarioId: "scenario_1",
        sortOrder: 1,
      },
    ],
  };
}

describe("ScenarioForm", () => {
  it("renders action type controls and step target dropdown", () => {
    const html = renderToStaticMarkup(
      <ScenarioForm
        action={async () => {}}
        cancelHref="/admin/scenarios"
        initial={buildInitialScenario()}
        knownBotCommands={[{ value: "/menu", label: "/menu" }]}
        submitLabel="Save"
        title="Edit scenario"
      />,
    );

    expect(html).toContain("Тип действия");
    expect(html).toContain("Перейти к сообщению");
    expect(html).toContain("Команда бота");
    expect(html).toContain("Заменить текущее сообщение");
    expect(html).toContain("Оплата тарифа");
    expect(html).toContain('name="steps"');
  });

  it("renders duplication and guarded deletion controls for existing scenarios", () => {
    const html = renderToStaticMarkup(
      <ScenarioForm
        action={async () => {}}
        cancelHref="/admin/scenarios"
        deleteAction={async () => {}}
        duplicateAction={async () => {}}
        duplicateStepAction={async () => {}}
        initial={buildInitialScenario()}
        knownBotCommands={[{ value: "/menu", label: "/menu" }]}
        submitLabel="Save"
        title="Edit scenario"
      />,
    );

    expect(html).toContain("Дублировать сценарий");
    expect(html).toContain("Дублировать шаг");
    expect(html).toContain("Удалить сценарий");
    expect(html).toContain("Удаление заблокируется");
  });

  it("renders per-step image file inputs alongside the manual image url field", () => {
    const html = renderToStaticMarkup(
      <ScenarioForm
        action={async () => {}}
        cancelHref="/admin/scenarios"
        initial={buildInitialScenario()}
        knownBotCommands={[{ value: "/menu", label: "/menu" }]}
        submitLabel="Save"
        title="Edit scenario"
      />,
    );

    expect(html).toContain('name="stepImageFile:step_1"');
    expect(html).toContain('name="stepImageFile:step_2"');
    expect(html).toContain("/uploads/admin/scenarios/message.png");
  });
});
