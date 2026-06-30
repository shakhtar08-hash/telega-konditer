export type AppPlan = "FREE" | "PRO" | "TEAM";

export const subscriptionPlans: Array<{ label: string; value: AppPlan }> = [
  { value: "FREE", label: "Без подписки" },
  { value: "PRO", label: "Базовый" },
  { value: "TEAM", label: "Продвинутый" },
];

export function getPlanLabel(plan: AppPlan) {
  return (
    subscriptionPlans.find((subscriptionPlan) => subscriptionPlan.value === plan)
      ?.label ?? plan
  );
}

export function planAllowsPromptAccess(plan: AppPlan) {
  return plan === "PRO" || plan === "TEAM";
}

export function isAppPlan(value: string): value is AppPlan {
  return subscriptionPlans.some((plan) => plan.value === value);
}
