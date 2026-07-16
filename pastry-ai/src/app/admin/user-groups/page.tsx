import Link from "next/link";
import { loadUserGroupsOrEmpty } from "@/app/admin/_lib/user-groups";
import { AdminPageHeader, DataTable, formatDate } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import { createUserGroup, deleteUserGroup } from "./actions";

export const dynamic = "force-dynamic";

type UserGroupRow = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  _count: {
    memberships: number;
  };
};

export default async function AdminUserGroupsPage() {
  const { groups, unavailable } = await loadUserGroupsOrEmpty(async () =>
    (await prisma.userGroup.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        _count: { select: { memberships: true } },
      },
    })) as UserGroupRow[],
  );

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Ручные группы для сегментации и триггеров."
        title="Группы пользователей"
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel>
          {unavailable ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#f4f7fb]">
                Группы пользователей пока недоступны
              </h3>
              <p className="text-sm text-[#97a4b8]">
                Таблица групп ещё не создана в базе. Страница продолжает открываться, но
                создавать и редактировать группы получится после применения миграции.
              </p>
            </div>
          ) : (
            <form action={createUserGroup} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#f4f7fb]">Создать группу</h3>
                <p className="text-sm text-[#97a4b8]">
                  Добавьте ручную группу, чтобы использовать ее в сегментации и триггерах.
                </p>
              </div>

              <AdminField label="Название группы">
                <AdminInput name="name" placeholder="Например, VIP" required />
              </AdminField>

              <AdminField label="Описание">
                <AdminTextarea
                  name="description"
                  placeholder="Для каких пользователей нужна эта группа"
                />
              </AdminField>

              <AdminButton type="submit">Создать группу</AdminButton>
            </form>
          )}
        </AdminPanel>

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
              header: "Участники",
              cell: (group) => String(group._count.memberships),
            },
            {
              header: "Обновлена",
              cell: (group) => formatDate(group.updatedAt),
            },
            {
              header: "",
              cell: (group) => (
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/user-groups/${group.id}`}
                    className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                  >
                    Открыть
                  </Link>
                  <form action={deleteUserGroup}>
                    <input name="id" type="hidden" value={group.id} />
                    <AdminButton type="submit" variant="danger">
                      Удалить
                    </AdminButton>
                  </form>
                </div>
              ),
              className: "w-[1%] whitespace-nowrap",
            },
          ]}
          empty={
            unavailable ? (
              <>
                <p>Группы пользователей пока недоступны.</p>
                <p className="mt-2">
                  Таблица групп ещё не создана в базе. После миграции список появится
                  здесь.
                </p>
              </>
            ) : (
              <>
                <p>Групп пока нет.</p>
                <p className="mt-2">
                  Создайте первую ручную группу, чтобы начать сегментацию.
                </p>
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
