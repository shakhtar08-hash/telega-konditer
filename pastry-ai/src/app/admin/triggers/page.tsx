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

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "disabled", label: "Disabled" },
] as const;

const sortOptions = [
  { value: "updated-desc", label: "Recently updated" },
  { value: "created-desc", label: "Recently created" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
] as const;

function getEventLabel(eventKey: string) {
  return (
    getTriggerEventOptions().find((option) => option.key === eventKey)?.label ?? eventKey
  );
}

function formatDelay(delayValue: number, delayUnit: TriggerRuleRow["delayUnit"]) {
  if (delayUnit === "now") {
    return "Now";
  }

  const unitLabel =
    delayValue === 1
      ? delayUnit.slice(0, -1)
      : delayUnit;

  return `In ${delayValue} ${unitLabel}`;
}

function summarizeCondition(condition: TriggerCondition) {
  switch (condition.field) {
    case "promoClaimed":
      return `Promo tariff received is ${condition.value ? "Yes" : "No"}`;
    case "hasActiveTariff":
      return `Active tariff is ${condition.value ? "Yes" : "No"}`;
    case "generationCount":
      return `Generations count ${condition.operator === "gte" ? "is at least" : "equals"} ${condition.value}`;
    case "groupId":
      return `User group contains ${condition.value}`;
    default:
      return "Custom condition";
  }
}

function summarizeConditions(rawConditions: TriggerRuleRow["conditions"]) {
  const conditions = Array.isArray(rawConditions)
    ? (rawConditions as TriggerCondition[])
    : [];

  if (conditions.length === 0) {
    return "No conditions";
  }

  return conditions.map(summarizeCondition).join(" AND ");
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

function sortRules(rules: TriggerRuleRow[], sort: string) {
  const copy = [...rules];

  switch (sort) {
    case "created-desc":
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
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
  const templates = getTriggerTemplates();
  const eventOptions = getTriggerEventOptions();
  const rules = (await prisma.triggerRule.findMany({
    orderBy: { updatedAt: "desc" },
  })) as TriggerRuleRow[];
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
          description="Event-based automations for follow-ups, activations, and win-back campaigns."
          title="Triggers"
        />
        <div className="rounded-lg border border-[#223047] bg-[#121a27] px-4 py-2 text-sm text-[#97a4b8]">
          Build reusable trigger rules around product events and conditions.
        </div>
      </header>

      <ChatBotSubNav />

      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-4">
          <AdminPanel className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">Ready templates</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Start from a prepared scenario and edit it before saving.
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
                    {getEventLabel(template.eventKey)} · {formatDelay(template.delayValue, template.delayUnit)}
                  </p>
                </Link>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#f4f7fb]">System events</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Jump into the event lane you want to manage.
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
              <h3 className="font-semibold text-[#f4f7fb]">Trigger rules</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Filter your automation inventory by event, status, or name.
              </p>
            </div>
            <Link
              href="/admin/triggers/new"
              className="inline-flex rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(124,92,255,0.28)] transition hover:bg-[#8d71ff]"
            >
              Create trigger
            </Link>
          </div>

          <form className="flex flex-wrap items-center gap-3" method="get">
            <AdminInput
              defaultValue={filters.search}
              name="search"
              placeholder="Search triggers..."
            />
            <AdminSelect defaultValue={filters.event} name="event">
              <option value="all">All events</option>
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
              Apply
            </button>
          </form>

          {filteredRules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-8 text-center text-sm text-[#97a4b8]">
              No triggers match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#223047] bg-[#0d1522]">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-[#192334] text-xs uppercase text-[#97a4b8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Trigger</th>
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Send</th>
                    <th className="px-4 py-3 font-semibold">Conditions</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr className="border-t border-[#223047]/80" key={rule.id}>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <div>
                          <p className="font-medium text-[#f4f7fb]">{rule.name}</p>
                          <p className="mt-1 text-xs text-[#97a4b8]">
                            Updated {rule.updatedAt.toLocaleDateString("en-US")}
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
                        {summarizeConditions(rule.conditions)}
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getStatusBadgeClass(rule.status)}`}
                        >
                          {rule.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#dbe3ef]">
                        <Link
                          href={`/admin/triggers/${rule.id}`}
                          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                        >
                          Open
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
