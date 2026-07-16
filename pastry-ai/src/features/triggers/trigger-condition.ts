import type {
  TriggerCondition,
  TriggerRuleRecord,
  TriggerUserState,
} from "./trigger-rule-types";
import { matchesSavedDynamicUserGroup } from "@/features/dynamic-user-groups/service";

const unitToMs = {
  now: 0,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} as const;

export async function evaluateConditions(
  conditions: TriggerCondition[],
  state: TriggerUserState,
): Promise<boolean> {
  for (const condition of conditions) {
    switch (condition.field) {
      case "promoClaimed":
        if (state.promoClaimed !== condition.value) {
          return false;
        }
        break;
      case "hasActiveTariff":
        if (state.hasActiveTariff !== condition.value) {
          return false;
        }
        break;
      case "generationCount":
        if (
          !(condition.operator === "gte"
            ? state.generationCount >= condition.value
            : state.generationCount === condition.value)
        ) {
          return false;
        }
        break;
      case "userGroupId":
      case "groupId":
        if (!state.groupIds.includes(condition.value)) {
          return false;
        }
        break;
      case "dynamicUserGroupId":
        if (!(await matchesSavedDynamicUserGroup(condition.value, state))) {
          return false;
        }
        break;
    }
  }

  return true;
}

export function computeSendAt(
  triggeredAt: Date,
  delayValue: number,
  delayUnit: TriggerRuleRecord["delayUnit"],
): Date {
  return new Date(triggeredAt.getTime() + delayValue * unitToMs[delayUnit]);
}
