import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import {
  getTriggerEventOptions,
  getTriggerTemplates,
} from "@/features/triggers/trigger-template";
import { createTriggerRule } from "../actions";
import { TriggerForm, type TriggerFormValues, type TriggerUserGroupOption } from "../trigger-form";

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
  "user.started": {
    key: "user.started",
    label: "Нажал Start",
    description: "Запускает follow-up или возвращающую цепочку после команды /start.",
  },
  "promo.granted": {
    key: "promo.granted",
    label: "Выдан промо-тариф",
    description: "Помогает догреть пользователя после выдачи промо-доступа.",
  },
  "promo.expired": {
    key: "promo.expired",
    label: "Промо-тариф закончился",
    description: "Возвращает пользователя, когда промо-доступ истекает.",
  },
  "tariff.paid": {
    key: "tariff.paid",
    label: "Оплачен тариф",
    description: "Подталкивает нового платящего пользователя к активации и первым действиям.",
  },
  "user.inactive_7d": {
    key: "user.inactive_7d",
    label: "Неактивен 7 дней",
    description: "Возвращает пользователя, который перестал пользоваться продуктом.",
  },
};

const templateNameCopy: Record<string, string> = {
  "after-start-no-promo": "После старта: промо не получено",
  "after-start-did-not-begin-using": "После старта: не начал пользоваться",
  "promo-granted-but-unused": "Промо выдано, но не использовано",
  "promo-expired": "Промо истекло",
  "promo-expired-after-active-usage": "Промо истекло после активного использования",
  "paid-but-not-activated": "Оплатил, но не активировался",
  "inactive-for-7-days": "Неактивен 7 дней",
};

function getLocalizedEventOptions() {
  return getTriggerEventOptions().map((option) => eventCopy[option.key] ?? option);
}

function buildInitialValues(templateKey?: string): TriggerFormValues {
  const template = getTriggerTemplates().find((item) => item.key === templateKey);

  return {
    conditions: template?.conditions ?? [],
    delayUnit: template?.delayUnit ?? "now",
    delayValue: template?.delayValue ?? 0,
    eventKey: template?.eventKey ?? getLocalizedEventOptions()[0]?.key ?? "user.started",
    id: null,
    imageUrl: null,
    messageText: "",
    name: template ? (templateNameCopy[template.key] ?? template.name) : "",
    status: "draft",
  };
}

export default async function NewTriggerPage({ searchParams }: NewTriggerPageProps) {
  const [{ prisma }, resolvedSearchParams] = await Promise.all([
    import("@/db/prisma"),
    searchParams ? searchParams : Promise.resolve({}),
  ]);
  const initial = buildInitialValues(resolvedSearchParams.template);
  const userGroups = await prisma.userGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const userGroupOptions: TriggerUserGroupOption[] = userGroups.map((group) => ({
    value: group.id,
    label: group.name,
  }));

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Создайте новое автоматическое правило по событию для follow-up и реактивации."
        title="Новый триггер"
      />
      <ChatBotSubNav />
      <TriggerForm
        action={createTriggerRule}
        cancelHref="/admin/triggers"
        eventOptions={getLocalizedEventOptions()}
        initial={initial}
        submitLabel="Создать триггер"
        title="Новый триггер"
        userGroupOptions={userGroupOptions}
      />
    </section>
  );
}
