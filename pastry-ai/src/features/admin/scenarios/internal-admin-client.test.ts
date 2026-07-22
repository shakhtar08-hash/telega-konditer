import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchInternalAdminJsonMock = vi.hoisted(() => vi.fn());
const isValidInternalServiceRequestMock = vi.hoisted(() => vi.fn(() => true));
const loadAdminScenariosPageDataMock = vi.hoisted(() => vi.fn());
const loadAdminScenarioEditorDataMock = vi.hoisted(() => vi.fn());
const performCreateScenarioMock = vi.hoisted(() => vi.fn());
const performUpdateScenarioMock = vi.hoisted(() => vi.fn());
const performDeleteScenarioMock = vi.hoisted(() => vi.fn());
const performDuplicateScenarioMock = vi.hoisted(() => vi.fn());
const performDuplicateScenarioStepMock = vi.hoisted(() => vi.fn());
const performDeleteScenarioStepMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/admin/shared/internal-admin-client", () => ({
  fetchInternalAdminJson: fetchInternalAdminJsonMock,
  shouldUseInternalAdminBridge: vi.fn(() => true),
}));

vi.mock("@/features/admin/scenarios/service", () => ({
  loadAdminScenarioEditorData: loadAdminScenarioEditorDataMock,
  loadAdminScenariosPageData: loadAdminScenariosPageDataMock,
  performCreateScenario: performCreateScenarioMock,
  performDeleteScenario: performDeleteScenarioMock,
  performDeleteScenarioStep: performDeleteScenarioStepMock,
  performDuplicateScenario: performDuplicateScenarioMock,
  performDuplicateScenarioStep: performDuplicateScenarioStepMock,
  performUpdateScenario: performUpdateScenarioMock,
}));

vi.mock("@/lib/env", () => ({
  loadEnv: () => ({ INTERNAL_API_SHARED_SECRET: "shared-secret" }),
}));

vi.mock("@/lib/internal-service-auth", () => ({
  isValidInternalServiceRequest: isValidInternalServiceRequestMock,
}));

import {
  fetchInternalAdminScenarioEditorData,
  fetchInternalAdminScenariosPageData,
  postInternalAdminScenarioAction,
} from "./internal-admin-client";
import { POST } from "@/app/api/internal/admin/scenarios/actions/route";
import { GET as GET_SCENARIOS } from "@/app/api/internal/admin/scenarios/route";
import { GET as GET_NEW_SCENARIO } from "@/app/api/internal/admin/scenarios/new/route";
import { GET as GET_SCENARIO } from "@/app/api/internal/admin/scenarios/[scenarioId]/route";

describe("scenario internal admin client", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchInternalAdminJsonMock.mockResolvedValue({ ok: true });
    isValidInternalServiceRequestMock.mockReturnValue(true);
  });

  it("returns duplicate ids while keeping non-duplicate actions void", async () => {
    const body = new FormData();
    body.set("name", "Abandoned cart");
    fetchInternalAdminJsonMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ id: "scenario_copy" })
      .mockResolvedValueOnce({ id: "step_copy" });

    await expect(
      postInternalAdminScenarioAction("createScenario", body),
    ).resolves.toBeUndefined();
    await expect(
      postInternalAdminScenarioAction("duplicateScenario", body),
    ).resolves.toEqual({ id: "scenario_copy" });
    await expect(
      postInternalAdminScenarioAction("duplicateScenarioStep", body),
    ).resolves.toEqual({ id: "step_copy" });

    expect(fetchInternalAdminJsonMock).toHaveBeenCalledTimes(3);
    const [path, init] = fetchInternalAdminJsonMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const requestBody = init.body as FormData;

    expect(path).toBe("/api/internal/admin/scenarios/actions");
    expect(init.method).toBe("POST");
    expect(requestBody.get("action")).toBe("createScenario");
    expect(requestBody.get("name")).toBe("Abandoned cart");
    expect(
      (fetchInternalAdminJsonMock.mock.calls[1] as [string, RequestInit])[1].body,
    ).toBeInstanceOf(FormData);
    expect(
      ((fetchInternalAdminJsonMock.mock.calls[1] as [string, RequestInit])[1]
        .body as FormData).get("action"),
    ).toBe("duplicateScenario");
    expect(
      ((fetchInternalAdminJsonMock.mock.calls[2] as [string, RequestInit])[1]
        .body as FormData).get("action"),
    ).toBe("duplicateScenarioStep");
  });

  it("loads scenario page and editor data through dedicated bridge paths", async () => {
    const createdAt = new Date("2026-07-18T10:00:00.000Z").toISOString();
    const updatedAt = new Date("2026-07-18T11:00:00.000Z").toISOString();
    fetchInternalAdminJsonMock
      .mockResolvedValueOnce({
        scenarios: [
          {
            createdAt,
            description: null,
            id: "scenario_1",
            name: "Welcome",
            startStepId: "step_1",
            status: "active",
            stepCount: 2,
            updatedAt,
          },
        ],
      })
      .mockResolvedValueOnce({ id: "scenario_1", steps: [] })
      .mockResolvedValueOnce(null);

    const pageData = await fetchInternalAdminScenariosPageData();
    const editorData = await fetchInternalAdminScenarioEditorData("scenario_1");
    const newEditorData = await fetchInternalAdminScenarioEditorData();

    expect(fetchInternalAdminJsonMock).toHaveBeenNthCalledWith(
      1,
      "/api/internal/admin/scenarios",
    );
    expect(fetchInternalAdminJsonMock).toHaveBeenNthCalledWith(
      2,
      "/api/internal/admin/scenarios/scenario_1",
    );
    expect(fetchInternalAdminJsonMock).toHaveBeenNthCalledWith(
      3,
      "/api/internal/admin/scenarios/new",
    );
    expect(pageData.scenarios[0].createdAt).toEqual(new Date(createdAt));
    expect(pageData.scenarios[0].updatedAt).toEqual(new Date(updatedAt));
    expect(editorData).toEqual({ id: "scenario_1", steps: [] });
    expect(newEditorData).toBeNull();
  });

  it("requires internal authorization for scenario routes", async () => {
    isValidInternalServiceRequestMock.mockReturnValue(false);

    await expect(GET_SCENARIOS(new Request("http://test.local"))).resolves.toMatchObject({
      status: 401,
    });
    await expect(GET_NEW_SCENARIO(new Request("http://test.local"))).resolves.toMatchObject({
      status: 401,
    });
    await expect(
      GET_SCENARIO(new Request("http://test.local"), {
        params: Promise.resolve({ scenarioId: "scenario_1" }),
      }),
    ).resolves.toMatchObject({ status: 401 });
    await expect(
      POST(
        new Request("http://test.local", {
          body: new FormData(),
          method: "POST",
        }),
      ),
    ).resolves.toMatchObject({ status: 401 });
  });

  it("routes scenario reads and actions to the RU scenario service", async () => {
    loadAdminScenariosPageDataMock.mockResolvedValue({ scenarios: [] });
    loadAdminScenarioEditorDataMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "scenario_1" });
    performDuplicateScenarioMock.mockResolvedValue("scenario_copy");
    performDuplicateScenarioStepMock.mockResolvedValue("step_copy");

    await expect(
      GET_SCENARIOS(new Request("http://test.local")),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      GET_NEW_SCENARIO(new Request("http://test.local")),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      GET_SCENARIO(new Request("http://test.local"), {
        params: Promise.resolve({ scenarioId: "scenario_1" }),
      }),
    ).resolves.toMatchObject({ status: 200 });

    const createBody = new FormData();
    createBody.set("action", "createScenario");
    await POST(
      new Request("http://test.local", { body: createBody, method: "POST" }),
    );

    const deleteBody = new FormData();
    deleteBody.set("action", "deleteScenario");
    deleteBody.set("id", "scenario_1");
    await POST(
      new Request("http://test.local", { body: deleteBody, method: "POST" }),
    );

    const duplicateScenarioBody = new FormData();
    duplicateScenarioBody.set("action", "duplicateScenario");
    duplicateScenarioBody.set("id", "scenario_1");
    const duplicateScenarioResponse = await POST(
      new Request("http://test.local", {
        body: duplicateScenarioBody,
        method: "POST",
      }),
    );

    const duplicateStepBody = new FormData();
    duplicateStepBody.set("action", "duplicateScenarioStep");
    duplicateStepBody.set("stepId", "step_1");
    const duplicateStepResponse = await POST(
      new Request("http://test.local", {
        body: duplicateStepBody,
        method: "POST",
      }),
    );

    expect(loadAdminScenariosPageDataMock).toHaveBeenCalledTimes(1);
    expect(loadAdminScenarioEditorDataMock.mock.calls[0]).toEqual([]);
    expect(loadAdminScenarioEditorDataMock).toHaveBeenNthCalledWith(
      2,
      "scenario_1",
    );
    expect(performCreateScenarioMock).toHaveBeenCalledTimes(1);
    expect(performDeleteScenarioMock).toHaveBeenCalledWith("scenario_1");
    await expect(duplicateScenarioResponse.json()).resolves.toEqual({
      id: "scenario_copy",
    });
    await expect(duplicateStepResponse.json()).resolves.toEqual({
      id: "step_copy",
    });
    expect(performDuplicateScenarioStepMock).toHaveBeenCalledWith("step_1");
  });
});
