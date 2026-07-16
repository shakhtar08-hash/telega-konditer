import Link from "next/link";
import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
} from "@/components/admin/form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { prisma } from "@/db/prisma";
import { buildDynamicUserGroupPreview } from "@/features/dynamic-user-groups/query";
import { listDynamicUserGroupOptions } from "@/features/dynamic-user-groups/service";
import { updateUserTariff } from "./actions";

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams?: Promise<{ dynamicGroupId?: string }> | { dynamicGroupId?: string };
};

async function loadLatestUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      createdAt: true,
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
          tariffPlan: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    take: 100,
  });
}

async function loadUsersByIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      createdAt: true,
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
          tariffPlan: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return userIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is (typeof users)[number] => Boolean(user));
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dynamicGroupId = resolvedSearchParams.dynamicGroupId?.trim() || "";

  const [dynamicGroupOptions, dynamicPreview, tariffPlans] = await Promise.all([
    listDynamicUserGroupOptions(),
    dynamicGroupId
      ? buildDynamicUserGroupPreview(dynamicGroupId, {
          take: 100,
        })
      : null,
    prisma.tariffPlan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  const users = dynamicPreview
    ? await loadUsersByIds(dynamicPreview.rows.map((row) => row.id))
    : await loadLatestUsers();

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Пользователи Telegram, зарегистрированные через бота. Здесь можно вручную назначать тариф, менять токены и дату окончания доступа."
        title="Пользователи"
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <AdminField label="Динамическая группа">
          <AdminSelect defaultValue={dynamicGroupId} name="dynamicGroupId">
            <option value="">Все пользователи</option>
            {dynamicGroupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminButton type="submit" variant="secondary">
          Применить
        </AdminButton>
      </form>

      <DataTable
        columns={[
          { header: "Telegram ID", cell: (user) => user.telegramId },
          {
            header: "Имя",
            cell: (user) => user.username ?? user.name ?? "Без имени",
          },
          {
            header: "Тариф",
            cell: (user) => (
              <form
                action={updateUserTariff}
                className="flex min-w-[480px] flex-wrap items-center gap-2"
              >
                <input name="id" type="hidden" value={user.id} />
                <AdminSelect
                  className="min-w-40 py-1"
                  defaultValue={user.userTariff?.tariffPlan?.id ?? ""}
                  name="tariffPlanId"
                >
                  <option value="">Без подписки</option>
                  {tariffPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </AdminSelect>
                <AdminInput
                  className="w-24 py-1 text-center"
                  defaultValue={user.userTariff?.remainingTokens ?? ""}
                  min="0"
                  name="tokens"
                  placeholder="Токены"
                  type="number"
                />
                <AdminInput
                  className="w-44 py-1"
                  defaultValue={formatDateTimeLocalValue(user.userTariff?.expiresAt)}
                  name="expiresAt"
                  type="datetime-local"
                />
                <AdminButton className="py-1" type="submit" variant="secondary">
                  Сохранить
                </AdminButton>
              </form>
            ),
          },
          {
            header: "Статус",
            cell: (user) => getTariffStatusLabel(user.userTariff),
          },
          {
            header: "Истекает",
            cell: (user) =>
              user.userTariff?.expiresAt
                ? formatDate(user.userTariff.expiresAt)
                : "—",
          },
          { header: "Создан", cell: (user) => formatDate(user.createdAt) },
          {
            header: "",
            cell: (user) => (
              <Link
                className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                href={`/admin/users/${user.id}`}
              >
                Открыть
              </Link>
            ),
          },
          {
            header: "",
            cell: (user) => (
              <DeleteUserButton userId={user.id} telegramId={user.telegramId} />
            ),
          },
        ]}
        empty="Пользователей пока нет. Они появятся после запуска Telegram-бота."
        getKey={(user) => user.id}
        rows={users}
      />
    </section>
  );
}

function formatDateTimeLocalValue(date?: Date) {
  return date ? date.toISOString().slice(0, 16) : "";
}

function getTariffStatusLabel(
  userTariff:
    | {
        expiresAt: Date;
        tariffPlan: { name: string; slug: string };
      }
    | null
    | undefined,
) {
  if (!userTariff) {
    return "Без подписки";
  }

  if (userTariff.expiresAt <= new Date()) {
    return `Истёк: ${userTariff.tariffPlan.name}`;
  }

  return userTariff.tariffPlan.name;
}
