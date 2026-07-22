import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchInternalAdminScenarioEditorDataMock,
  fetchInternalAdminScenariosPageDataMock,
  loadAdminScenarioEditorDataMock,
  loadAdminScenariosPageDataMock,
} = vi.hoisted(() => ({
  fetchInternalAdminScenarioEditorDataMock: vi.fn(),
  fetchInternalAdminScenariosPageDataMock: vi.fn(),
  loadAdminScenarioEditorDataMock: vi.fn(),
  loadAdminScenariosPageDataMock: vi.fn(),
}));

vi.mock("@/components/admin/chat-bot-subnav", () => ({
  default: () => <nav>subnav</nav>,
}));

vi.mock("@/features/admin/scenarios/service", () => ({
  loadAdminScenarioEditorData: loadAdminScenarioEditorDataMock,
  loadAdminScenariosPageData: loadAdminScenariosPageDataMock,
}));

vi.mock("@/features/admin/scenarios/internal-admin-client", () => ({
  fetchInternalAdminScenarioEditorData: fetchInternalAdminScenarioEditorDataMock,
  fetchInternalAdminScenariosPageData: fetchInternalAdminScenariosPageDataMock,
}));

vi.mock("./scenario-form", () => ({
  ScenarioForm: ({
    deleteAction,
    duplicateAction,
    initial,
    knownBotCommands,
    submitLabel,
    title,
  }: {
    deleteAction?: unknown;
    duplicateAction?: unknown;
    initial: { name: string; steps: unknown[] };
    knownBotCommands: Array<{ label: string; value: string }>;
    submitLabel: string;
    title: string;
  }) => (
    <div>
      {`scenario-form:${title}|${submitLabel}|${initial.name}|steps:${initial.steps.length}|delete:${String(
        Boolean(deleteAction),
      )}|duplicate:${String(Boolean(duplicateAction))}|commands:${knownBotCommands
        .map((option) => option.value)
        .join(",")}`}
    </div>
  ),
}));

import ScenarioPage from "./[scenarioId]/page";
import NewScenarioPage from "./new/page";
import AdminScenariosPage from "./page";

describe("scenario admin pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    loadAdminScenariosPageDataMock.mockResolvedValue({ scenarios: [] });
    fetchInternalAdminScenariosPageDataMock.mockResolvedValue({ scenarios: [] });
    loadAdminScenarioEditorDataMock.mockResolvedValue(null);
    fetchInternalAdminScenarioEditorDataMock.mockResolvedValue(null);
  });

  it("renders scenario list actions", async () => {
    loadAdminScenariosPageDataMock.mockResolvedValue({
      scenarios: [
        {
          createdAt: new Date("2026-07-10T10:00:00.000Z"),
          description: "Welcome chain",
          id: "scenario_1",
          name: "Onboarding",
          startStepId: "step_1",
          status: "active",
          stepCount: 2,
          updatedAt: new Date("2026-07-11T10:00:00.000Z"),
        },
      ],
    });

    const html = renderToStaticMarkup(await AdminScenariosPage());

    expect(html).toContain("Сценарии");
    expect(html).toContain("Onboarding");
    expect(html).toContain("Создать сценарий");
    expect(html).toContain("Дублировать");
  });

  it("passes shared known bot commands into the new scenario form", async () => {
    const html = renderToStaticMarkup(await NewScenarioPage());

    expect(html).toContain("scenario-form:Новый сценарий");
    expect(html).toContain("steps:1");
    expect(html).toContain("commands:/menu,/recipe,/bestrecipe,/ask,/photo,/styles");
  });

  it("loads scenario list from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";

    await AdminScenariosPage();

    expect(fetchInternalAdminScenariosPageDataMock).toHaveBeenCalled();
    expect(loadAdminScenariosPageDataMock).not.toHaveBeenCalled();
  });

  it("loads the edit scenario form from RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    fetchInternalAdminScenarioEditorDataMock.mockResolvedValue({
      description: null,
      id: "scenario_1",
      name: "Welcome",
      startStepId: "step_1",
      status: "draft",
      steps: [
        {
          buttons: [],
          id: "step_1",
          imageUrl: null,
          messageText: "Hello",
          name: "Start",
          scenarioId: "scenario_1",
          sortOrder: 0,
        },
      ],
    });

    const html = renderToStaticMarkup(
      await ScenarioPage({
        params: Promise.resolve({ scenarioId: "scenario_1" }),
      }),
    );

    expect(html).toContain("scenario-form:Редактирование сценария");
    expect(html).toContain("delete:true");
    expect(html).toContain("duplicate:true");
    expect(fetchInternalAdminScenarioEditorDataMock).toHaveBeenCalledWith("scenario_1");
    expect(loadAdminScenarioEditorDataMock).not.toHaveBeenCalled();
  });
});
