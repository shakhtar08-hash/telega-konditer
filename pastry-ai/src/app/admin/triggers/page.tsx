import type { TriggerRule } from "@prisma/client";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { AdminInput, AdminPanel, AdminSelect } from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import {
  getTriggerEventOptions,
  getTriggerTemplates,
} from "@/features/triggers/trigger-template";
import type { TriggerCondition } from "@/features/triggers/trigger-rule-types";

export const dynamic = "force-dynamic";

type SearchParams = {
  event?: string;
  search?: string;
  sort?: string;
  status?: string;
};

type TriggerRuleRow = Pick<
  TriggerRule,
  | "id"
  | "name"
  | "eventKey"
  | "status"
  | "delayValue"
  | "delayUnit"
  | "conditions"
  | "createdAt"
  | "updatedAt"
>;

type LocalizedEventOption = {
  key: string;
  label: string;
  description: string;
};

type LocalizedTemplate = {
  key: string;
  name: string;
  eventKey: string;
  delayValue: number;
  delayUnit: TriggerRuleRow["delayUnit"];
  conditions: TriggerCondition[];
};

const statusOptions = [
  { value: "all", label: "Все статусы" },
  { value: "active", label: "Активные" },
  { value: "draft", label: "Черновики" },
  { value: "disabled", label: "Отключенные" },
] as const;

const sortOptions = [
  { value: "updated-desc", label: "Сначала новые изменения" },
  { value: "created-desc", label: "Сначала новые триггеры" },
  { value: "name-asc", label: "По названию А-Я" },
  { value: "name-desc", label: "По названию Я-А" },
] as const;

const eventCopy: Record<string, LocalizedEventOption> = {
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

function getLocalizedTemplates(): LocalizedTemplate[] {
  return getTriggerTemplates().map((template) => ({
    ...template,
    name: templateNameCopy[template.key] ?? template.name,
  }));
}

function getEventLabel(eventKey: string) {
  return (
    getLocalizedEventOptions().find((option) => option.key === eventKey)?.label ?? eventKey
  );
}

function formatDelay(delayValue: number, delayUnit: TriggerRuleRow["delayUnit"]) {
  if (delayUnit === "now") {
    return "Сразу";
  }

  const unitLabel =
    delayUnit === "minutes"
      ? delayValue === 1
        ? "минуту"
        : delayValue < 5 || delayValue > 20
          ? "минут"
          : "минуты"
      : delayUnit === "hours"
        ? delayValue === 1
          ? "час"
          : delayValue < 5 || delayValue > 20
            ? "часов"
            : "часа"
        : delayValue === 1
          ? "день"
          : delayValue < 5 || delayValue > 20
            ? "дней"
            : "дня";

  return `Через ${delayValue} ${unitLabel}`;
}

function summarizeCondition(condition: TriggerCondition) {
  switch (condition.field) {
    case "promoClaimed":
      return `Промо получено: ${condition.value ? "да" : "нет"}`;
    case "hasActiveTariff":
      return `Активный тариф: ${condition.value ? "да" : "нет"}`;
    case "generationCount":
      return condition.operator === "gte"
        ? `Количество генераций не меньше ${condition.value}`
        : `Количество генераций равно ${condition.value}`;
    case "userGroupId":
    case "groupId":
      return `Состоит в группе: ${condition.value}`;
    default:
      return "Пользовательское условие";
  }
}

function summarizeConditions(
  rawConditions: TriggerRuleRow["conditions"],
  userGroupNames: Map<string, string>,
) {
  const conditions = Array.isArray(rawConditions)
    ? (rawConditions as TriggerCondition[])
    : [];

  if (conditions.length === 0) {
    return "Без условий";
  }

  return conditions
    .map((condition) => {
      if (condition.field === "userGroupId" || condition.field === "groupId") {
        const label = userGroupNames.get(condition.value) ?? "Удаленная группа";
        return `Состоит в группе: ${label}`;
      }

      return summarizeCondition(condition);
    })
    .join(" И ");
}

function getStatusBadgeClass(status: TriggerRuleRow["status"]) {
  switch (status) {
    case "active":
      return "border-[#1f6f43] bg-[#12261a] text-[#9ae6b4]";
    case "disabled":
      return "border-[#6b2430] bg-[#2a1218] text-[#fecaca]";
    case "draft":
    default:
      return "border-[#2a3a55] bg-[#192334] text-[#dbe3ef]";
  }
}

function getStatusLabel(status: TriggerRuleRow["status"]) {
  switch (status) {
    case "active":
      return "Активен";
    case "disabled":
      return "Отключен";
    case "draft":
    default:
      return "Черновик";
  }
}

function sortRules(rules: TriggerRuleRow[], sort: string) {
  const copy = [...rules];

  switch (sort) {
    case "created-desc":
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    case "name-desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name, "ru"));
    case "updated-desc":
    default:
      return copy.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

function buildFilterHref(
  current: Required<SearchParams>,
  patch: Partial<Required<SearchParams>>,
) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.search) {
    params.set("search", next.search);
  }

  if (next.event !== "all") {
    params.set("event", next.event);
  }

  if (next.status !== "all") {
    params.set("status", next.status);
  }

  if (next.sort !== "updated-desc") {
    params.set("sort", next.sort);
  }

  const query = params.toString();
  return query ? `/admin/triggers?${query}` : "/admin/triggers";
}

export default async function AdminTriggersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const templates = getLocalizedTemplates();
  const eventOptions = getLocalizedEventOptions();
  const rules = (await prisma.triggerRule.findMany({
    orderBy: { updatedAt: "desc" },
  })) as TriggerRuleRow[];
  const userGroups = await prisma.userGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const userGroupNames = new Map(userGroups.map((group) => [group.id, group.name]));
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = {
    event: resolvedSearchParams.event?.trim() || "all",
    search: resolvedSearchParams.search?.trim() || "",
    sort: resolvedSearchParams.sort?.trim() || "updated-desc",
    status: resolvedSearchParams.status?.trim() || "all",
  };
  const searchNeedle = filters.search.toLowerCase();

  const filteredRules = sortRules(
    rules.filter((rule) => {
      const matchesEvent = filters.event === "all" || rule.eventKey === filters.event;
      const matchesStatus = filters.status === "all" || rule.status === filters.status;
      const matchesSearch =
        searchNeedle.length === 0 ||
        rule.name.toLowerCase().includes(searchNeedle) ||
        getEventLabel(rule.eventKey).toLowerCase().includes(searchNeedle);

      return matchesEvent && matchesStatus && matchesSearch;
    }),
    filters.sort,
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <AdminPageHeader
          description="Автоматические сообщения по событиям, реактивации и follow-up сценариям."
          title="Триггеры"
        />
        <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
          Собирайте переиспользуемые правила вокруг событий продукта и условий аудитории.
        </div>
      </header>

      <ChatBotSubNav />

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <AdminPanel className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Готовые шаблоны</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Начните с готового сценария и доработайте его перед сохранением.
              </p>
            </div>
            <div className="space-y-2">
              {templates.map((template) => (
                <Link
                  key={template.key}
                  href={`/admin/triggers/new?template=${template.key}`}
                  className="block rounded-lg border border-[#223047] bg-[#0d1522] p-3 transition hover:border-[#41506b] hover:bg-[#111b2b]"
                >
                  <p className="text-sm font-medium text-[#f4f7fb]">{template.name}</p>
                  <p className="mt-1 text-xs text-[#97a4b8]">
                    {getEventLabel(template.eventKey)} - {formatDelay(template.delayValue, template.delayUnit)}
                  </p>
                </Link>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Системные события</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Переключайтесь на нужную дорожку событий и смотрите связанные правила.
              </p>
            </div>
            <div className="space-y-2">
              {eventOptions.map((eventOption) => {
                const isActive = filters.event === eventOption.key;

                return (
                  <Link
                    key={eventOption.key}
                    href={buildFilterHref(filters, { event: eventOption.key })}
                    className={`block rounded-lg border p-3 transition ${
                      isActive
                        ? "border-[#6d5dfc] bg-[#191f38]"
                        : "border-[#223047] bg-[#0d1522] hover:border-[#41506b] hover:bg-[#111b2b]"
                    }`}
                  >
                    <p className="text-sm font-medium text-[#f4f7fb]">{eventOption.label}</p>
                    <p className="mt-1 text-xs text-[#97a4b8]">{eventOption.description}</p>
                  </Link>
                );
              })}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Правила триггеров</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Фильтруйте автоматизации по событию, статусу или названию.
              </p>
            </div>
            <Link
              href="/admin/triggers/new"
              className="inline-flex rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(124,92,255,0.28)] transition hover:bg-[#8d71ff]"
            >
              Создать триггер
            </Link>
          </div>

          <form className="flex flex-wrap items-center gap-3" method="get">
            <AdminInput
              defaultValue={filters.search}
              name="search"
              placeholder="Найти триггер"
            />
            <AdminSelect defaultValue={filters.event} name="event">
              <option value="all">Все события</option>
              {eventOptions.map((eventOption) => (
                <option key={eventOption.key} value={eventOption.key}>
                  {eventOption.label}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect defaultValue={filters.status} name="status">
              {statusOptions.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </AdminSelect>
            <AdminSelect defaultValue={filters.sort} name="sort">
              {sortOptions.map((sortOption) => (
                <option key={sortOption.value} value={sortOption.value}>
                  {sortOption.label}
                </option>
              ))}
            </AdminSelect>
            <button
              className="rounded-md border border-[#2a3a55] bg-[#192334] px-3 py-2 text-sm font-medium text-[#dbe3ef] transition hover:bg-[#223047]"
              type="submit"
            >
              Применить
            </button>
          </form>

          {filteredRules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-8 text-center text-sm text-[#97a4b8]">
              Нет триггеров по текущим фильтрам.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#223047] bg-[#0d1522]">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-[#192334] text-xs uppercase text-[#97a4b8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Триггер</th>
                    <th className="px-4 py-3 font-semibold">Событие</th>
                    <th className="px-4 py-3 font-semibold">Отправка</th>
                    <th className="px-4 py-3 font-semibold">Условия</th>
                    <th className="px-4 py-3 font-semibold">Статус</th>
                    <th className="px-4 py-3 font-semibold">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr className="border-t border-[#223047]/80" key={rule.id}>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <div>
                          <p className="font-medium text-[#f4f7fb]">{rule.name}</p>
                          <p className="mt-1 text-xs text-[#97a4b8]">
                            Обновлен {rule.updatedAt.toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <div>
                          <p className="font-medium text-[#f4f7fb]">{getEventLabel(rule.eventKey)}</p>
                          <p className="mt-1 text-xs text-[#97a4b8]">{rule.eventKey}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">{formatDelay(rule.delayValue, rule.delayUnit)}</td>
                      <td className="max-w-[320px] px-4 py-3 text-[#97a4b8]">
                        {summarizeConditions(rule.conditions, userGroupNames)}
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(rule.status)}`}
                        >
                          {getStatusLabel(rule.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <Link
                          href={`/admin/triggers/${rule.id}`}
                          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                        >
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </div>
    </section>
  );
}
