import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { fetchInternalAdminTriggerEditorData } from "@/features/admin/triggers/internal-admin-client";
import { loadAdminTriggerEditorData } from "@/features/admin/triggers/service";
import { getTriggerEventOptions } from "@/features/triggers/trigger-template";
import type { TriggerCondition } from "@/features/triggers/trigger-rule-types";
import { sendTriggerTestMessage } from "../actions";
import { parseTriggerButtons } from "../trigger-buttons-form";
import {
  TriggerForm,
  type TriggerDynamicUserGroupOption,
  type TriggerUserGroupOption,
} from "../trigger-form";

type TriggerRulePageProps = {
  params: Promise<{ triggerId: string }> | { triggerId: string };
};

const eventCopy: Record<
  string,
  {
    description: string;
    key: string;
    label: string;
  }
> = {
  "promo.expired": {
    description:
      "Возвращает пользователя, когда промо-доступ истекает.",
    key: "promo.expired",
    label: "Промо-тариф закончился",
  },
  "promo.granted": {
    description:
      "Помогает догреть пользователя после выдачи промо-доступа.",
    key: "promo.granted",
    label: "Выдан промо-тариф",
  },
  "tariff.paid": {
    description:
      "Подталкивает нового платящего пользователя к активации и первым действиям.",
    key: "tariff.paid",
    label: "Оплачен тариф",
  },
  "user.inactive_7d": {
    description:
      "Возвращает пользователя, который перестал пользоваться продуктом.",
    key: "user.inactive_7d",
    label: "Неактивен 7 дней",
  },
  "user.started": {
    description:
      "Запускает follow-up или возвращающую цепочку после команды /start.",
    key: "user.started",
    label: "Нажал Start",
  },
};

function getLocalizedEventOptions() {
  return getTriggerEventOptions().map((option) => eventCopy[option.key] ?? option);
}

export default async function TriggerRulePage({ params }: TriggerRulePageProps) {
  const resolvedParams = await params;
  const { dynamicGroups, rule, userGroups } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminTriggerEditorData(resolvedParams.triggerId)
      : await loadAdminTriggerEditorData(resolvedParams.triggerId);

  if (!rule) {
    notFound();
  }

  const userGroupOptions: TriggerUserGroupOption[] = userGroups.map((group) => ({
    label: group.name,
    value: group.id,
  }));
  const dynamicUserGroupOptions: TriggerDynamicUserGroupOption[] = dynamicGroups.map(
    (group) => ({
      label:
        group.status === "active"
          ? group.name
          : `${group.name} (выключена)`,
      value: group.id,
    }),
  );

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Обновляйте тайминг, условия и текст сообщения для существующего триггера."
        title="Редактирование триггера"
      />
      <ChatBotSubNav />
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        deleteAction="/api/admin/triggers/delete"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={getLocalizedEventOptions()}
        initial={{
          buttons: parseTriggerButtons(rule.buttons),
          conditions: Array.isArray(rule.conditions)
            ? (rule.conditions as TriggerCondition[])
            : [],
          delayUnit: rule.delayUnit as "now" | "minutes" | "hours" | "days",
          delayValue: rule.delayValue,
          eventKey: rule.eventKey,
          id: rule.id,
          imageUrl: rule.imageUrl,
          messageText: rule.messageText,
          name: rule.name,
          status: rule.status as "draft" | "active" | "disabled",
        }}
        submitLabel="Сохранить изменения"
        testSendAction={sendTriggerTestMessage}
        title="Редактирование триггера"
        userGroupOptions={userGroupOptions}
      />
    </section>
  );
}
