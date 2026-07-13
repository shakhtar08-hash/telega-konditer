import type { TriggerCondition } from "./trigger-rule-types";

export type TriggerTemplate = {
  key: string;
  name: string;
  eventKey: string;
  delayValue: number;
  delayUnit: "now" | "minutes" | "hours" | "days";
  conditions: TriggerCondition[];
};

export type TriggerEventOption = {
  key: string;
  label: string;
  description: string;
};

const triggerTemplates = [
  {
    key: "after-start-no-promo",
    name: "After Start: no promo",
    eventKey: "user.started",
    delayValue: 15,
    delayUnit: "minutes",
    conditions: [
      { field: "promoClaimed", operator: "is", value: false },
      { field: "hasActiveTariff", operator: "is", value: false },
    ],
  },
  {
    key: "after-start-did-not-begin-using",
    name: "After Start: did not begin using",
    eventKey: "user.started",
    delayValue: 1,
    delayUnit: "days",
    conditions: [
      { field: "generationCount", operator: "equals", value: 0 },
      { field: "hasActiveTariff", operator: "is", value: false },
    ],
  },
  {
    key: "promo-granted-but-unused",
    name: "Promo granted but unused",
    eventKey: "promo.granted",
    delayValue: 30,
    delayUnit: "minutes",
    conditions: [{ field: "generationCount", operator: "equals", value: 0 }],
  },
  {
    key: "promo-expired",
    name: "Promo expired",
    eventKey: "promo.expired",
    delayValue: 5,
    delayUnit: "minutes",
    conditions: [{ field: "hasActiveTariff", operator: "is", value: false }],
  },
  {
    key: "promo-expired-after-active-usage",
    name: "Promo expired after active usage",
    eventKey: "promo.expired",
    delayValue: 2,
    delayUnit: "hours",
    conditions: [
      { field: "generationCount", operator: "gte", value: 3 },
      { field: "hasActiveTariff", operator: "is", value: false },
    ],
  },
  {
    key: "paid-but-not-activated",
    name: "Paid but not activated",
    eventKey: "tariff.paid",
    delayValue: 1,
    delayUnit: "days",
    conditions: [{ field: "generationCount", operator: "equals", value: 0 }],
  },
  {
    key: "inactive-for-7-days",
    name: "Inactive for 7 days",
    eventKey: "user.inactive_7d",
    delayValue: 0,
    delayUnit: "now",
    conditions: [{ field: "hasActiveTariff", operator: "is", value: true }],
  },
] satisfies readonly TriggerTemplate[];

const triggerEventOptions = [
  {
    key: "user.started",
    label: "Pressed Start",
    description: "Launch onboarding or a comeback sequence after /start.",
  },
  {
    key: "promo.granted",
    label: "Promo tariff granted",
    description: "Follow up after promo access becomes available.",
  },
  {
    key: "promo.expired",
    label: "Promo tariff expired",
    description: "Win users back when promo access runs out.",
  },
  {
    key: "tariff.paid",
    label: "Paid tariff activated",
    description: "Guide new paying users into activation and usage.",
  },
  {
    key: "user.inactive_7d",
    label: "Inactive for 7 days",
    description: "Re-engage subscribers who stopped using the product.",
  },
] satisfies readonly TriggerEventOption[];

export function getTriggerTemplates() {
  return triggerTemplates;
}

export function getTriggerEventOptions() {
  return triggerEventOptions;
}
