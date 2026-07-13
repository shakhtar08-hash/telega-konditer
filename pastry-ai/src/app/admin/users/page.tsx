import Link from "next/link";
import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import {
  AdminButton,
  AdminInput,
  AdminSelect,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { updateUserTariff } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, tariffPlans] = await Promise.all([
    prisma.user.findMany({
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
    }),
    prisma.tariffPlan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Пользователи Telegram, зарегистрированные через бота. Здесь можно вручную назначать тариф, менять токены и дату окончания доступа."
        title="Пользователи"
      />
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
