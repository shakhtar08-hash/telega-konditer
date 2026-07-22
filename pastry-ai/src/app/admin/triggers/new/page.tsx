import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { fetchInternalAdminTriggerEditorData } from "@/features/admin/triggers/internal-admin-client";
import { loadAdminTriggerEditorData } from "@/features/admin/triggers/service";
import {
  getTriggerEventOptions,
  getTriggerTemplates,
} from "@/features/triggers/trigger-template";
import { sendTriggerTestMessage } from "../actions";
import {
  TriggerForm,
  type TriggerDynamicUserGroupOption,
  type TriggerFormValues,
  type TriggerUserGroupOption,
} from "../trigger-form";

type NewTriggerPageProps = {
  searchParams?: Promise<{ template?: string }> | { template?: string };
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

const templateNameCopy: Record<string, string> = {
  "after-start-did-not-begin-using":
    "После старта: не начал пользоваться",
  "after-start-no-promo": "После старта: промо не получено",
  "inactive-for-7-days": "Неактивен 7 дней",
  "paid-but-not-activated": "Оплатил, но не активировался",
  "promo-expired": "Промо истекло",
  "promo-expired-after-active-usage":
    "Промо истекло после активного использования",
  "promo-granted-but-unused": "Промо выдано, но не использовано",
};

function getLocalizedEventOptions() {
  return getTriggerEventOptions().map((option) => eventCopy[option.key] ?? option);
}

function buildInitialValues(templateKey?: string): TriggerFormValues {
  const template = getTriggerTemplates().find((item) => item.key === templateKey);

  return {
    buttons: [],
    conditions: template?.conditions ?? [],
    delayUnit: template?.delayUnit ?? "now",
    delayValue: template?.delayValue ?? 0,
    deliveryType: "MESSAGE",
    eventKey: template?.eventKey ?? getLocalizedEventOptions()[0]?.key ?? "user.started",
    id: null,
    imageUrl: null,
    messageText: "",
    name: template ? (templateNameCopy[template.key] ?? template.name) : "",
    scenarioId: null,
    status: "draft",
  };
}

export default async function NewTriggerPage({ searchParams }: NewTriggerPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initial = buildInitialValues(resolvedSearchParams.template);
  const { dynamicGroups, scenarios, userGroups } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminTriggerEditorData()
      : await loadAdminTriggerEditorData();
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
        description="Создайте новое автоматическое правило по событию для follow-up и реактивации."
        title="Новый триггер"
      />
      <ChatBotSubNav />
      <TriggerForm
        action="/api/admin/triggers/save"
        cancelHref="/admin/triggers"
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={getLocalizedEventOptions()}
        initial={initial}
        scenarioOptions={scenarios}
        submitLabel="Создать триггер"
        testSendAction={sendTriggerTestMessage}
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />
    </section>
  );
}
