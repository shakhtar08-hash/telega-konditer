import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type {
  AdminTriggerDynamicUserGroupRecord,
  AdminTriggerEditorRuleRecord,
  AdminTriggerListRuleRecord,
  AdminTriggerScenarioOptionRecord,
  AdminTriggerUserGroupRecord,
  TriggerTestSendResult,
} from "./service";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

function reviveTriggerListRule(
  rule: Omit<AdminTriggerListRuleRecord, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  },
): AdminTriggerListRuleRecord {
  return {
    ...rule,
    createdAt: new Date(rule.createdAt),
    updatedAt: new Date(rule.updatedAt),
  };
}

export async function fetchInternalAdminTriggersPageData(): Promise<{
  groups: AdminTriggerUserGroupRecord[];
  rules: AdminTriggerListRuleRecord[];
  userGroupsUnavailable: boolean;
}> {
  const data = await fetchInternalAdminJson<{
    groups: AdminTriggerUserGroupRecord[];
    rules: Array<
      Omit<AdminTriggerListRuleRecord, "createdAt" | "updatedAt"> & {
        createdAt: string;
        updatedAt: string;
      }
    >;
    userGroupsUnavailable?: boolean;
  }>("/api/internal/admin/triggers");

  return {
    groups: data.groups,
    rules: data.rules.map((rule) => reviveTriggerListRule(rule)),
    userGroupsUnavailable: data.userGroupsUnavailable ?? false,
  };
}

export async function fetchInternalAdminTriggerEditorData(
  triggerId?: string,
): Promise<{
  dynamicGroups: AdminTriggerDynamicUserGroupRecord[];
  dynamicGroupsUnavailable: boolean;
  rule: AdminTriggerEditorRuleRecord | null;
  scenarios: AdminTriggerScenarioOptionRecord[];
  userGroups: AdminTriggerUserGroupRecord[];
}> {
  const path = triggerId
    ? `/api/internal/admin/triggers/${encodeURIComponent(triggerId)}`
    : "/api/internal/admin/triggers/new";

  return fetchInternalAdminJson<{
    dynamicGroups: AdminTriggerDynamicUserGroupRecord[];
    dynamicGroupsUnavailable?: boolean;
    rule: AdminTriggerEditorRuleRecord | null;
    scenarios?: AdminTriggerScenarioOptionRecord[];
    userGroups: AdminTriggerUserGroupRecord[];
  }>(path).then((data) => ({
    dynamicGroups: data.dynamicGroups,
    dynamicGroupsUnavailable: data.dynamicGroupsUnavailable ?? false,
    rule: data.rule,
    scenarios: data.scenarios ?? [],
    userGroups: data.userGroups,
  }));
}

export async function postInternalAdminTriggerAction(
  action:
    | "createTriggerRule"
    | "deleteTriggerRule"
    | "runTriggerNow"
    | "sendTriggerTest"
    | "updateTriggerRule",
  payload: FormData,
): Promise<TriggerTestSendResult | void> {
  const supportsFiles =
    action === "createTriggerRule" || action === "updateTriggerRule";
  const requestBody = supportsFiles
    ? (() => {
        const body = new FormData();
        for (const [key, value] of payload.entries()) {
          body.append(key, value);
        }
        body.set("action", action);
        return body;
      })()
    : JSON.stringify({
        action,
        ...Object.fromEntries(payload.entries()),
      });

  return fetchInternalAdminJson<TriggerTestSendResult | { ok: true }>(
    "/api/internal/admin/triggers/actions",
    {
      body: requestBody,
      method: "POST",
    },
  ).then((result) => {
    if ("message" in result && "ok" in result) {
      return result;
    }

    return;
  });
}
