export type ScenarioButtonActionType =
  | "URL"
  | "SCENARIO_STEP"
  | "BOT_COMMAND"
  | "TARIFF_PURCHASE"
  | "MAIN_MENU";

export type ScenarioTransitionMode = "SEND_NEW" | "REPLACE_CURRENT";

export type ScenarioButtonRecord = {
  id: string;
  stepId: string;
  text: string;
  sortOrder: number;
  actionType: ScenarioButtonActionType;
  actionValue: string | null;
  transitionMode: ScenarioTransitionMode | null;
};

export type ScenarioStepRecord = {
  id: string;
  scenarioId: string;
  name: string;
  messageText: string;
  imageUrl: string | null;
  sortOrder: number;
  buttons: ScenarioButtonRecord[];
};

export type ScenarioRecord = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "disabled";
  startStepId: string | null;
  steps: ScenarioStepRecord[];
};
