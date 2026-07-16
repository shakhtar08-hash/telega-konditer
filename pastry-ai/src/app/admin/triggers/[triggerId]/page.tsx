import { notFound } from "next/navigation";
import { loadDynamicUserGroupsOrEmpty } from "@/app/admin/_lib/dynamic-user-groups";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { prisma } from "@/db/prisma";
import { getTriggerEventOptions } from "@/features/triggers/trigger-template";
import type { TriggerCondition } from "@/features/triggers/trigger-rule-types";
import {
  deleteTriggerRule,
  sendTriggerTestMessage,
  updateTriggerRule,
} from "../actions";
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

function getLocalizedEventOptions() {
  return getTriggerEventOptions().map((option) => eventCopy[option.key] ?? option);
}

export default async function TriggerRulePage({ params }: TriggerRulePageProps) {
  const resolvedParams = await params;
  const [rule, userGroups, dynamicGroupsResult] = await Promise.all([
    prisma.triggerRule.findUnique({
      where: { id: resolvedParams.triggerId },
      select: {
        conditions: true,
        delayUnit: true,
        delayValue: true,
        eventKey: true,
        id: true,
        imageUrl: true,
        messageText: true,
        name: true,
        buttons: true,
        status: true,
      },
    }),
    prisma.userGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadDynamicUserGroupsOrEmpty(() =>
      prisma.dynamicUserGroup.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      }),
    ),
  ]);

  if (!rule) {
    notFound();
  }
  const dynamicGroups = dynamicGroupsResult.groups;

  const userGroupOptions: TriggerUserGroupOption[] = userGroups.map((group) => ({
    value: group.id,
    label: group.name,
  }));
  const dynamicUserGroupOptions: TriggerDynamicUserGroupOption[] = dynamicGroups.map((group) => ({
    value: group.id,
    label: group.status === "active" ? group.name : `${group.name} (выключена)`,
  }));

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Обновляйте тайминг, условия и текст сообщения для существующего триггера."
        title="Редактирование триггера"
      />
      <ChatBotSubNav />
      <TriggerForm
        action={updateTriggerRule}
        cancelHref="/admin/triggers"
        deleteAction={deleteTriggerRule}
        dynamicUserGroupOptions={dynamicUserGroupOptions}
        eventOptions={getLocalizedEventOptions()}
        initial={{
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
          buttons: parseTriggerButtons(rule.buttons),
          status: rule.status as "draft" | "active" | "disabled",
        }}
        submitLabel="Сохранить изменения"
        title="Редактирование триггера"
        testSendAction={sendTriggerTestMessage}
        userGroupOptions={userGroupOptions}
      />
    </section>
  );
}
