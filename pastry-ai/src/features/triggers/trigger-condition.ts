import type {
  TriggerCondition,
  TriggerRuleRecord,
  TriggerUserState,
} from "./trigger-rule-types";

const unitToMs = {
  now: 0,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} as const;

export function evaluateConditions(
  conditions: TriggerCondition[],
  state: TriggerUserState,
): boolean {
  return conditions.every((condition) => {
    switch (condition.field) {
      case "promoClaimed":
        return state.promoClaimed === condition.value;
      case "hasActiveTariff":
        return state.hasActiveTariff === condition.value;
      case "generationCount":
        return condition.operator === "gte"
          ? state.generationCount >= condition.value
          : state.generationCount === condition.value;
      case "userGroupId":
      case "groupId":
        return state.groupIds.includes(condition.value);
    }
  });
}

export function computeSendAt(
  triggeredAt: Date,
  delayValue: number,
  delayUnit: TriggerRuleRecord["delayUnit"],
): Date {
  return new Date(triggeredAt.getTime() + delayValue * unitToMs[delayUnit]);
}
