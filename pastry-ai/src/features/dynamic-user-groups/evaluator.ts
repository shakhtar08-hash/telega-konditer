import type { DynamicGroupCondition, DynamicUserGroupDefinition } from "./rule-types";

export type DynamicGroupEvaluationContext = {
  promoClaimed: boolean;
  hasActiveTariff: boolean;
  tariffExpired: boolean;
  generationCount: number;
  daysSinceLastActivity: number | null;
  daysSinceSignup: number;
  remainingTokens: number;
};

function matchesCondition(
  condition: DynamicGroupCondition,
  context: DynamicGroupEvaluationContext,
): boolean {
  switch (condition.field) {
    case "promoClaimed":
    case "hasActiveTariff":
    case "tariffExpired": {
      const actual = context[condition.field];
      return condition.operator === "is" ? actual === condition.value : actual !== condition.value;
    }
    case "generationCount":
    case "daysSinceSignup":
    case "remainingTokens": {
      const actual = context[condition.field];
      if (condition.operator === "equals") {
        return actual === condition.value;
      }

      return condition.operator === "gte" ? actual >= condition.value : actual <= condition.value;
    }
    case "daysSinceLastActivity": {
      if (context.daysSinceLastActivity === null) {
        return false;
      }

      if (condition.operator === "equals") {
        return context.daysSinceLastActivity === condition.value;
      }

      return condition.operator === "gte"
        ? context.daysSinceLastActivity >= condition.value
        : context.daysSinceLastActivity <= condition.value;
    }
  }
}

export function matchesDynamicUserGroup(
  definition: DynamicUserGroupDefinition,
  context: DynamicGroupEvaluationContext,
): boolean {
  return definition.logicOperator === "AND"
    ? definition.conditions.every((condition) => matchesCondition(condition, context))
    : definition.conditions.some((condition) => matchesCondition(condition, context));
}
