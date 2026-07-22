import { fetchInternalAdminJson } from "@/features/admin/shared/internal-admin-client";
import type {
  AdminScenarioEditorRecord,
  AdminScenarioListRecord,
} from "./service";

export {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";

function reviveScenarioListRecord(
  scenario: Omit<AdminScenarioListRecord, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  },
): AdminScenarioListRecord {
  return {
    ...scenario,
    createdAt: new Date(scenario.createdAt),
    updatedAt: new Date(scenario.updatedAt),
  };
}

export async function fetchInternalAdminScenariosPageData(): Promise<{
  scenarios: AdminScenarioListRecord[];
}> {
  const data = await fetchInternalAdminJson<{
    scenarios: Array<
      Omit<AdminScenarioListRecord, "createdAt" | "updatedAt"> & {
        createdAt: string;
        updatedAt: string;
      }
    >;
  }>("/api/internal/admin/scenarios");

  return {
    scenarios: data.scenarios.map((scenario) =>
      reviveScenarioListRecord(scenario),
    ),
  };
}

export async function fetchInternalAdminScenarioEditorData(
  id?: string,
): Promise<AdminScenarioEditorRecord | null> {
  const path = id
    ? `/api/internal/admin/scenarios/${encodeURIComponent(id)}`
    : "/api/internal/admin/scenarios/new";

  return fetchInternalAdminJson<AdminScenarioEditorRecord | null>(path);
}

export async function postInternalAdminScenarioAction(
  action:
    | "createScenario"
    | "updateScenario"
    | "deleteScenario"
    | "duplicateScenario"
    | "duplicateScenarioStep"
    | "deleteScenarioStep",
  payload: FormData,
): Promise<{ id: string } | void> {
  const requestBody = new FormData();
  for (const [key, value] of payload.entries()) {
    requestBody.append(key, value);
  }
  requestBody.set("action", action);

  return fetchInternalAdminJson<{ id: string } | { ok: true }>(
    "/api/internal/admin/scenarios/actions",
    {
      body: requestBody,
      method: "POST",
    },
  ).then((result) => {
    if ("id" in result) {
      return result;
    }

    return;
  });
}
