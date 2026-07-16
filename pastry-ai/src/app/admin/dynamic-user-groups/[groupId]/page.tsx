import Link from "next/link";
import { AdminPageHeader, formatDate } from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";
import { buildDynamicUserGroupPreview } from "@/features/dynamic-user-groups/query";
import { deleteDynamicUserGroup, updateDynamicUserGroup } from "../actions";
import { DynamicGroupForm } from "../dynamic-group-form";

export const dynamic = "force-dynamic";

type AdminDynamicUserGroupPageProps = {
  params: Promise<{ groupId: string }> | { groupId: string };
};

export default async function AdminDynamicUserGroupPage({
  params,
}: AdminDynamicUserGroupPageProps) {
  const resolvedParams = await params;
  const preview = await buildDynamicUserGroupPreview(resolvedParams.groupId);

  if (!preview.group) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          description="Такой динамической группы не найдено."
          title="Динамическая группа"
        />
        <Link
          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
          href="/admin/dynamic-user-groups"
        >
          Ко всем динамическим группам
        </Link>
      </section>
    );
  }

  const triggerRules = await prisma.triggerRule.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      conditions: true,
    },
  });

  const usedBy = triggerRules.filter((rule) =>
    Array.isArray(rule.conditions)
      ? rule.conditions.some(
          (condition) =>
            typeof condition === "object" &&
            condition !== null &&
            "field" in condition &&
            "value" in condition &&
            (condition as { field?: unknown }).field === "dynamicUserGroupId" &&
            (condition as { value?: unknown }).value === preview.group?.id,
        )
      : false,
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          description={preview.group.description || "Динамическая группа с живым пересчётом пользователей."}
          title={preview.group.name}
        />
        <Link
          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
          href="/admin/dynamic-user-groups"
        >
          Ко всем динамическим группам
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <DynamicGroupForm
          action={updateDynamicUserGroup}
          cancelHref="/admin/dynamic-user-groups"
          deleteAction={deleteDynamicUserGroup}
          initial={{
            id: preview.group.id,
            name: preview.group.name,
            description: preview.group.description || "",
            status: preview.group.status === "disabled" ? "disabled" : "active",
            definition: preview.group.definition,
          }}
          submitLabel="Сохранить группу"
          title="Параметры группы"
        />

        <div className="space-y-4">
          <div className="rounded-lg border border-[#223047] bg-[#121a27] p-5">
            <h3 className="text-lg font-semibold text-[#f4f7fb]">Превью сегмента</h3>
            <p className="mt-1 text-sm text-[#97a4b8]">
              Сейчас подходит {preview.total} пользователей. Последнее обновление группы:{" "}
              {formatDate(preview.group.updatedAt)}.
            </p>

            {preview.rows.length === 0 ? (
              <p className="mt-4 text-sm text-[#97a4b8]">Сейчас под это правило никто не подходит.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {preview.rows.map((user) => (
                  <div
                    className="rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                    key={user.id}
                  >
                    <p className="font-medium text-[#f4f7fb]">
                      {user.username || user.name || "Без имени"}
                    </p>
                    <p className="mt-1 text-xs text-[#97a4b8]">Telegram ID: {user.telegramId}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[#223047] bg-[#121a27] p-5">
            <h3 className="text-lg font-semibold text-[#f4f7fb]">Где используется</h3>
            {usedBy.length === 0 ? (
              <p className="mt-2 text-sm text-[#97a4b8]">
                Эта группа пока не подключена ни к одному триггеру.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {usedBy.map((rule) => (
                  <Link
                    className="block rounded-lg border border-[#223047] bg-[#0d1522] p-3 text-sm text-[#dbe3ef] transition hover:border-[#6d5dfc]"
                    href={`/admin/triggers/${rule.id}`}
                    key={rule.id}
                  >
                    {rule.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
