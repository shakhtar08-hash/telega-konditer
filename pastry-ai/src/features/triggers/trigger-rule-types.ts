export type TriggerCondition =
  | { field: "promoClaimed"; operator: "is"; value: boolean }
  | { field: "hasActiveTariff"; operator: "is"; value: boolean }
  | { field: "generationCount"; operator: "equals" | "gte"; value: number }
  | { field: "groupId"; operator: "contains"; value: string };

export type TriggerUserState = {
  plan: string;
  promoClaimed: boolean;
  hasActiveTariff: boolean;
  generationCount: number;
  groupIds: string[];
};

export type TriggerRuleRecord = {
  id: string;
  name: string;
  eventKey: string;
  status: "draft" | "active" | "disabled";
  delayValue: number;
  delayUnit: "now" | "minutes" | "hours" | "days";
  messageText: string;
  imageUrl: string | null;
  buttons: unknown;
  conditions: TriggerCondition[];
};
