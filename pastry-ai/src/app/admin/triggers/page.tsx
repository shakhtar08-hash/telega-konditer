import type { TriggerRule } from "@prisma/client";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { AdminInput, AdminPanel, AdminSelect } from "@/components/admin/form";
import { fetchInternalAdminTriggersPageData } from "@/features/admin/triggers/internal-admin-client";
import { loadAdminTriggersPageData } from "@/features/admin/triggers/service";
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
  description: string;
  key: string;
  label: string;
};

type LocalizedTemplate = {
  conditions: TriggerCondition[];
  delayUnit: TriggerRuleRow["delayUnit"];
  delayValue: number;
  eventKey: string;
  key: string;
  name: string;
};

const statusOptions = [
  { value: "all", label: "Р’СЃРµ СЃС‚Р°С‚СѓСЃС‹" },
  { value: "active", label: "РђРєС‚РёРІРЅС‹Рµ" },
  { value: "draft", label: "Р§РµСЂРЅРѕРІРёРєРё" },
  { value: "disabled", label: "РћС‚РєР»СЋС‡РµРЅРЅС‹Рµ" },
] as const;

const sortOptions = [
  { value: "updated-desc", label: "РЎРЅР°С‡Р°Р»Р° РЅРѕРІС‹Рµ РёР·РјРµРЅРµРЅРёСЏ" },
  { value: "created-desc", label: "РЎРЅР°С‡Р°Р»Р° РЅРѕРІС‹Рµ С‚СЂРёРіРіРµСЂС‹" },
  { value: "name-asc", label: "РџРѕ РЅР°Р·РІР°РЅРёСЋ Рђ-РЇ" },
  { value: "name-desc", label: "РџРѕ РЅР°Р·РІР°РЅРёСЋ РЇ-Рђ" },
] as const;

const eventCopy: Record<string, LocalizedEventOption> = {
  "promo.expired": {
    description:
      "Р’РѕР·РІСЂР°С‰Р°РµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, РєРѕРіРґР° РїСЂРѕРјРѕ-РґРѕСЃС‚СѓРї РёСЃС‚РµРєР°РµС‚.",
    key: "promo.expired",
    label: "РџСЂРѕРјРѕ-С‚Р°СЂРёС„ Р·Р°РєРѕРЅС‡РёР»СЃСЏ",
  },
  "promo.granted": {
    description:
      "РџРѕРјРѕРіР°РµС‚ РґРѕРіСЂРµС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕСЃР»Рµ РІС‹РґР°С‡Рё РїСЂРѕРјРѕ-РґРѕСЃС‚СѓРїР°.",
    key: "promo.granted",
    label: "Р’С‹РґР°РЅ РїСЂРѕРјРѕ-С‚Р°СЂРёС„",
  },
  "tariff.paid": {
    description:
      "РџРѕРґС‚Р°Р»РєРёРІР°РµС‚ РЅРѕРІРѕРіРѕ РїР»Р°С‚СЏС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ Рє Р°РєС‚РёРІР°С†РёРё Рё РїРµСЂРІС‹Рј РґРµР№СЃС‚РІРёСЏРј.",
    key: "tariff.paid",
    label: "РћРїР»Р°С‡РµРЅ С‚Р°СЂРёС„",
  },
  "user.inactive_7d": {
    description:
      "Р’РѕР·РІСЂР°С‰Р°РµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, РєРѕС‚РѕСЂС‹Р№ РїРµСЂРµСЃС‚Р°Р» РїРѕР»СЊР·РѕРІР°С‚СЊСЃСЏ РїСЂРѕРґСѓРєС‚РѕРј.",
    key: "user.inactive_7d",
    label: "РќРµР°РєС‚РёРІРµРЅ 7 РґРЅРµР№",
  },
  "user.started": {
    description:
      "Р—Р°РїСѓСЃРєР°РµС‚ follow-up РёР»Рё РІРѕР·РІСЂР°С‰Р°СЋС‰СѓСЋ С†РµРїРѕС‡РєСѓ РїРѕСЃР»Рµ РєРѕРјР°РЅРґС‹ /start.",
    key: "user.started",
    label: "РќР°Р¶Р°Р» Start",
  },
};

const templateNameCopy: Record<string, string> = {
  "after-start-did-not-begin-using":
    "РџРѕСЃР»Рµ СЃС‚Р°СЂС‚Р°: РЅРµ РЅР°С‡Р°Р» РїРѕР»СЊР·РѕРІР°С‚СЊСЃСЏ",
  "after-start-no-promo": "РџРѕСЃР»Рµ СЃС‚Р°СЂС‚Р°: РїСЂРѕРјРѕ РЅРµ РїРѕР»СѓС‡РµРЅРѕ",
  "inactive-for-7-days": "РќРµР°РєС‚РёРІРµРЅ 7 РґРЅРµР№",
  "paid-but-not-activated": "РћРїР»Р°С‚РёР», РЅРѕ РЅРµ Р°РєС‚РёРІРёСЂРѕРІР°Р»СЃСЏ",
  "promo-expired": "РџСЂРѕРјРѕ РёСЃС‚РµРєР»Рѕ",
  "promo-expired-after-active-usage":
    "РџСЂРѕРјРѕ РёСЃС‚РµРєР»Рѕ РїРѕСЃР»Рµ Р°РєС‚РёРІРЅРѕРіРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ",
  "promo-granted-but-unused": "РџСЂРѕРјРѕ РІС‹РґР°РЅРѕ, РЅРѕ РЅРµ РёСЃРїРѕР»СЊР·РѕРІР°РЅРѕ",
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
    getLocalizedEventOptions().find((option) => option.key === eventKey)?.label ??
    eventKey
  );
}

function formatDelay(delayValue: number, delayUnit: TriggerRuleRow["delayUnit"]) {
  if (delayUnit === "now") {
    return "РЎСЂР°Р·Сѓ";
  }

  const unitLabel =
    delayUnit === "minutes"
      ? delayValue === 1
        ? "РјРёРЅСѓС‚Сѓ"
        : delayValue < 5 || delayValue > 20
          ? "РјРёРЅСѓС‚"
          : "РјРёРЅСѓС‚С‹"
      : delayUnit === "hours"
        ? delayValue === 1
          ? "С‡Р°СЃ"
          : delayValue < 5 || delayValue > 20
            ? "С‡Р°СЃРѕРІ"
            : "С‡Р°СЃР°"
        : delayValue === 1
          ? "РґРµРЅСЊ"
          : delayValue < 5 || delayValue > 20
            ? "РґРЅРµР№"
            : "РґРЅСЏ";

  return `Р§РµСЂРµР· ${delayValue} ${unitLabel}`;
}

function summarizeCondition(condition: TriggerCondition) {
  switch (condition.field) {
    case "promoClaimed":
      return `РџСЂРѕРјРѕ РїРѕР»СѓС‡РµРЅРѕ: ${condition.value ? "РґР°" : "РЅРµС‚"}`;
    case "hasActiveTariff":
      return `РђРєС‚РёРІРЅС‹Р№ С‚Р°СЂРёС„: ${condition.value ? "РґР°" : "РЅРµС‚"}`;
    case "generationCount":
      return condition.operator === "gte"
        ? `РљРѕР»РёС‡РµСЃС‚РІРѕ РіРµРЅРµСЂР°С†РёР№ РЅРµ РјРµРЅСЊС€Рµ ${condition.value}`
        : `РљРѕР»РёС‡РµСЃС‚РІРѕ РіРµРЅРµСЂР°С†РёР№ СЂР°РІРЅРѕ ${condition.value}`;
    case "userGroupId":
    case "groupId":
      return `РЎРѕСЃС‚РѕРёС‚ РІ РіСЂСѓРїРїРµ: ${condition.value}`;
    default:
      return "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРѕРµ СѓСЃР»РѕРІРёРµ";
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
    return "Р‘РµР· СѓСЃР»РѕРІРёР№";
  }

  return conditions
    .map((condition) => {
      if (condition.field === "userGroupId" || condition.field === "groupId") {
        const label =
          userGroupNames.get(condition.value) ??
          condition.value ??
          "РЈРґР°Р»РµРЅРЅР°СЏ РіСЂСѓРїРїР°";
        return `РЎРѕСЃС‚РѕРёС‚ РІ РіСЂСѓРїРїРµ: ${label}`;
      }

      return summarizeCondition(condition);
    })
    .join(" Р ");
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
      return "РђРєС‚РёРІРµРЅ";
    case "disabled":
      return "РћС‚РєР»СЋС‡РµРЅ";
    case "draft":
    default:
      return "Р§РµСЂРЅРѕРІРёРє";
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
  const { groups: userGroups, rules, userGroupsUnavailable } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminTriggersPageData()
      : await loadAdminTriggersPageData();
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
      const matchesEvent =
        filters.event === "all" || rule.eventKey === filters.event;
      const matchesStatus =
        filters.status === "all" || rule.status === filters.status;
      const matchesSearch =
        searchNeedle.length === 0 ||
        rule.name.toLowerCase().includes(searchNeedle) ||
        getEventLabel(rule.eventKey).toLowerCase().includes(searchNeedle);

      return matchesEvent && matchesStatus && matchesSearch;
    }) as TriggerRuleRow[],
    filters.sort,
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <AdminPageHeader
          description="РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРёРµ СЃРѕРѕР±С‰РµРЅРёСЏ РїРѕ СЃРѕР±С‹С‚РёСЏРј, СЂРµР°РєС‚РёРІР°С†РёРё Рё follow-up СЃС†РµРЅР°СЂРёСЏРј."
          title="РўСЂРёРіРіРµСЂС‹"
        />
        <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
          РЎРѕР±РёСЂР°Р№С‚Рµ РїРµСЂРµРёСЃРїРѕР»СЊР·СѓРµРјС‹Рµ РїСЂР°РІРёР»Р° РІРѕРєСЂСѓРі
          СЃРѕР±С‹С‚РёР№ РїСЂРѕРґСѓРєС‚Р° Рё СѓСЃР»РѕРІРёР№ Р°СѓРґРёС‚РѕСЂРёРё.
        </div>
      </header>

      <ChatBotSubNav />

      {userGroupsUnavailable ? (
        <div className="rounded-lg border border-[#6b4d1f] bg-[#22180d] px-4 py-3 text-sm text-[#f6d7a7]">
          Р“СЂСѓРїРїС‹ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РЅРµРґРѕСЃС‚СѓРїРЅС‹: С‚Р°Р±Р»РёС†Р° РµС‰С‘
          РЅРµ СЃРѕР·РґР°РЅР° РІ Р±Р°Р·Рµ. РЎРїРёСЃРѕРє С‚СЂРёРіРіРµСЂРѕРІ РѕС‚РєСЂС‹С‚, РЅРѕ
          РЅР°Р·РІР°РЅРёСЏ РіСЂСѓРїРї РІСЂРµРјРµРЅРЅРѕ РЅРµ РїРѕРґРіСЂСѓР¶Р°СЋС‚СЃСЏ.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <AdminPanel className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Р“РѕС‚РѕРІС‹Рµ С€Р°Р±Р»РѕРЅС‹</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                РќР°С‡РЅРёС‚Рµ СЃ РіРѕС‚РѕРІРѕРіРѕ СЃС†РµРЅР°СЂРёСЏ Рё РґРѕСЂР°Р±РѕС‚Р°Р№С‚Рµ
                РµРіРѕ РїРµСЂРµРґ СЃРѕС…СЂР°РЅРµРЅРёРµРј.
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
                    {getEventLabel(template.eventKey)} -{" "}
                    {formatDelay(template.delayValue, template.delayUnit)}
                  </p>
                </Link>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">РЎРёСЃС‚РµРјРЅС‹Рµ СЃРѕР±С‹С‚РёСЏ</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                РџРµСЂРµРєР»СЋС‡Р°Р№С‚РµСЃСЊ РЅР° РЅСѓР¶РЅСѓСЋ РґРѕСЂРѕР¶РєСѓ СЃРѕР±С‹С‚РёР№
                Рё СЃРјРѕС‚СЂРёС‚Рµ СЃРІСЏР·Р°РЅРЅС‹Рµ РїСЂР°РІРёР»Р°.
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
                    <p className="text-sm font-medium text-[#f4f7fb]">
                      {eventOption.label}
                    </p>
                    <p className="mt-1 text-xs text-[#97a4b8]">
                      {eventOption.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">РџСЂР°РІРёР»Р° С‚СЂРёРіРіРµСЂРѕРІ</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Р¤РёР»СЊС‚СЂСѓР№С‚Рµ Р°РІС‚РѕРјР°С‚РёР·Р°С†РёРё РїРѕ СЃРѕР±С‹С‚РёСЋ, СЃС‚Р°С‚СѓСЃСѓ
                РёР»Рё РЅР°Р·РІР°РЅРёСЋ.
              </p>
            </div>
            <Link
              href="/admin/triggers/new"
              className="inline-flex rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(124,92,255,0.28)] transition hover:bg-[#8d71ff]"
            >
              РЎРѕР·РґР°С‚СЊ С‚СЂРёРіРіРµСЂ
            </Link>
          </div>

          <form className="space-y-3" method="get">
            <div className="md:max-w-[360px]">
              <AdminInput
                defaultValue={filters.search}
                name="search"
                placeholder="РќР°Р№С‚Рё С‚СЂРёРіРіРµСЂ"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AdminSelect
                className="md:max-w-[220px]"
                defaultValue={filters.event}
                name="event"
              >
                <option value="all">Р’СЃРµ СЃРѕР±С‹С‚РёСЏ</option>
                {eventOptions.map((eventOption) => (
                  <option key={eventOption.key} value={eventOption.key}>
                    {eventOption.label}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                className="md:max-w-[220px]"
                defaultValue={filters.status}
                name="status"
              >
                {statusOptions.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                className="md:max-w-[220px]"
                defaultValue={filters.sort}
                name="sort"
              >
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
                РџСЂРёРјРµРЅРёС‚СЊ
              </button>
            </div>
          </form>

          {filteredRules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-8 text-center text-sm text-[#97a4b8]">
              РќРµС‚ С‚СЂРёРіРіРµСЂРѕРІ РїРѕ С‚РµРєСѓС‰РёРј С„РёР»СЊС‚СЂР°Рј.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#223047] bg-[#0d1522]">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-[#192334] text-xs uppercase text-[#97a4b8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">РўСЂРёРіРіРµСЂ</th>
                    <th className="px-4 py-3 font-semibold">РЎРѕР±С‹С‚РёРµ</th>
                    <th className="px-4 py-3 font-semibold">РћС‚РїСЂР°РІРєР°</th>
                    <th className="px-4 py-3 font-semibold">РЈСЃР»РѕРІРёСЏ</th>
                    <th className="px-4 py-3 font-semibold">РЎС‚Р°С‚СѓСЃ</th>
                    <th className="px-4 py-3 font-semibold">Р”РµР№СЃС‚РІРёРµ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr className="border-t border-[#223047]/80" key={rule.id}>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <div>
                          <p className="font-medium text-[#f4f7fb]">{rule.name}</p>
                          <p className="mt-1 text-xs text-[#97a4b8]">
                            РћР±РЅРѕРІР»РµРЅ{" "}
                            {rule.updatedAt.toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <div>
                          <p className="font-medium text-[#f4f7fb]">
                            {getEventLabel(rule.eventKey)}
                          </p>
                          <p className="mt-1 text-xs text-[#97a4b8]">{rule.eventKey}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        {formatDelay(rule.delayValue, rule.delayUnit)}
                      </td>
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
                          РћС‚РєСЂС‹С‚СЊ
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
