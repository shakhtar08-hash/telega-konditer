import type { DynamicGroupCondition, DynamicUserGroupDefinition } from "./rule-types";

function parseDynamicCondition(input: unknown): DynamicGroupCondition | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const condition = input as Record<string, unknown>;
  const field = condition.field;
  const operator = condition.operator;
  const value = condition.value;

  switch (field) {
    case "promoClaimed":
    case "hasActiveTariff":
    case "tariffExpired":
      return (operator === "is" || operator === "isNot") && typeof value === "boolean"
        ? { field, operator, value }
        : null;
    case "generationCount":
    case "daysSinceLastActivity":
    case "daysSinceSignup":
    case "remainingTokens":
      return (operator === "equals" || operator === "gte" || operator === "lte") &&
        typeof value === "number" &&
        Number.isFinite(value)
        ? { field, operator, value }
        : null;
    default:
      return null;
  }
}

export function parseDynamicUserGroupDefinition(input: unknown): DynamicUserGroupDefinition | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const logicOperator =
    record.logicOperator === "AND" || record.logicOperator === "OR"
      ? record.logicOperator
      : null;
  const rawConditions = Array.isArray(record.conditions) ? record.conditions : null;

  if (!logicOperator || !rawConditions || rawConditions.length === 0) {
    return null;
  }

  const conditions = rawConditions
    .map((condition) => parseDynamicCondition(condition))
    .filter((condition): condition is DynamicGroupCondition => condition !== null);

  return conditions.length === rawConditions.length ? { logicOperator, conditions } : null;
}
