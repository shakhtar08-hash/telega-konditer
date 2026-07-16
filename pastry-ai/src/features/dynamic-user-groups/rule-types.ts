export type DynamicBooleanField = "promoClaimed" | "hasActiveTariff" | "tariffExpired";

export type DynamicNumericField =
  | "generationCount"
  | "daysSinceLastActivity"
  | "daysSinceSignup"
  | "remainingTokens";

export type DynamicGroupCondition =
  | { field: DynamicBooleanField; operator: "is" | "isNot"; value: boolean }
  | { field: DynamicNumericField; operator: "equals" | "gte" | "lte"; value: number };

export type DynamicUserGroupDefinition = {
  logicOperator: "AND" | "OR";
  conditions: DynamicGroupCondition[];
};
