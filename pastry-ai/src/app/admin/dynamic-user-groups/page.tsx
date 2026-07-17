import Link from "next/link";
import { AdminPageHeader, DataTable, StatusBadge, formatDate } from "@/components/admin/data-table";
import {
  fetchInternalAdminDynamicGroupsPageData,
} from "@/features/admin/groups/internal-admin-client";
import { loadAdminDynamicGroupsPageData } from "@/features/admin/groups/service";
import { createDynamicUserGroup, deleteDynamicUserGroup } from "./actions";
import { DynamicGroupForm } from "./dynamic-group-form";

export const dynamic = "force-dynamic";

export default async function AdminDynamicUserGroupsPage() {
  const { groups, unavailable } = process.env.APP_ROLE === "ingress"
    ? await fetchInternalAdminDynamicGroupsPageData()
    : await loadAdminDynamicGroupsPageData();

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Виртуальные сегменты пользователей с живым пересчётом по условиям."
        title="Динамические группы"
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        {unavailable ? (
          <div className="rounded-lg border border-[#223047] bg-[#121a27] p-5">
            <h3 className="text-lg font-semibold text-[#f4f7fb]">
              Динамические группы пока недоступны
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#97a4b8]">
              Таблица динамических групп ещё не создана в базе. После применения миграции здесь
              появится конструктор правил.
            </p>
          </div>
        ) : (
          <DynamicGroupForm
            action={createDynamicUserGroup}
            cancelHref="/admin/dynamic-user-groups"
            initial={{
              id: null,
              name: "",
              description: "",
              status: "active",
              definition: {
                logicOperator: "AND",
                conditions: [],
              },
            }}
            submitLabel="Создать группу"
            title="Новая динамическая группа"
          />
        )}

        <DataTable
          columns={[
            {
              header: "Группа",
              cell: (group) => (
                <div>
                  <p className="font-medium text-[#f4f7fb]">{group.name}</p>
                  <p className="mt-1 text-xs text-[#97a4b8]">
                    {group.description || "Без описания"}
                  </p>
                </div>
              ),
            },
            {
              header: "Статус",
              cell: (group) => <StatusBadge active={group.status === "active"} />,
            },
            {
              header: "Логика",
              cell: (group) => (group.logicOperator === "OR" ? "ИЛИ" : "И"),
            },
            {
              header: "Условий",
              cell: (group) => String(Array.isArray(group.conditionsJson) ? group.conditionsJson.length : 0),
            },
            {
              header: "Превью",
              cell: (group) => String(group.previewCount),
            },
            {
              header: "Обновлена",
              cell: (group) => formatDate(group.updatedAt),
            },
            {
              header: "",
              className: "w-[1%] whitespace-nowrap",
              cell: (group) => (
                <div className="flex items-center justify-end gap-2">
                  <Link
                    className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                    href={`/admin/dynamic-user-groups/${group.id}`}
                  >
                    Открыть
                  </Link>
                  <form action={deleteDynamicUserGroup}>
                    <input name="id" type="hidden" value={group.id} />
                    <button
                      className="rounded-md border border-[#7f1d1d] bg-[#2a1218] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[#3a1720]"
                      type="submit"
                    >
                      Удалить
                    </button>
                  </form>
                </div>
              ),
            },
          ]}
          empty={
            unavailable ? (
              <>
                <p>Динамические группы пока недоступны.</p>
                <p className="mt-2">После миграции список появится здесь.</p>
              </>
            ) : (
              <>
                <p>Групп пока нет.</p>
                <p className="mt-2">Создайте первую динамическую группу для сегментации.</p>
              </>
            )
          }
          getKey={(group) => group.id}
          rows={groups}
        />
      </div>
    </section>
  );
}
