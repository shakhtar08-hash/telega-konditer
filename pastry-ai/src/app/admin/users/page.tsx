import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import { AdminButton, AdminSelect } from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import {
  getPlanLabel,
  isAppPlan,
  subscriptionPlans,
} from "@/features/subscriptions/plans";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function updateUserPlan(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const plan = String(formData.get("plan") ?? "");

  if (!id || !isAppPlan(plan)) {
    return;
  }

  await prisma.user.update({
    data: { plan },
    where: { id },
  });

  revalidatePath("/admin/users");
}

export async function updateUserTokens(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const tokens = Number(formData.get("tokens") ?? 0);
  if (!id || tokens < 0) return;
  await prisma.userTariff.update({
    where: { userId: id },
    data: { remainingTokens: tokens },
  });
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      telegramId: true,
      username: true,
      name: true,
      plan: true,
      credits: true,
      createdAt: true,
      userTariff: {
        select: {
          remainingTokens: true,
          expiresAt: true,
          tariffPlan: { select: { name: true } },
        },
      },
    },
    take: 100,
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Пользователи Telegram, зарегистрированные через бота. Уровень подписки можно менять вручную."
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
            header: "Уровень",
            cell: (user) => (
              <form action={updateUserPlan} className="flex items-center gap-2">
                <input name="id" type="hidden" value={user.id} />
                <AdminSelect
                  className="min-w-36 py-1"
                  defaultValue={user.plan}
                  name="plan"
                >
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </AdminSelect>
                <AdminButton className="py-1" type="submit" variant="secondary">
                  Сохранить
                </AdminButton>
              </form>
            ),
          },
          { header: "Кредиты", cell: (user) => user.credits },
          {
            header: "Тариф",
            cell: (user) => user.userTariff?.tariffPlan?.name ?? "—",
          },
          {
            header: "Токены",
            cell: (user) => (
              <form action={updateUserTokens} className="flex items-center gap-2">
                <input name="id" type="hidden" value={user.id} />
                <input
                  className="w-20 rounded border border-[#223047] bg-[#0d1522] px-2 py-1 text-center text-sm text-[#eef4ff]"
                  defaultValue={user.userTariff?.remainingTokens ?? 0}
                  name="tokens"
                  type="number"
                  min="0"
                />
                <button
                  className="rounded bg-[#223047] px-2 py-1 text-xs text-[#97a4b8] hover:text-white"
                  type="submit"
                >OK</button>
              </form>
            ),
          },
          {
            header: "Истекает",
            cell: (user) => user.userTariff?.expiresAt ? formatDate(user.userTariff.expiresAt) : "—",
          },
          { header: "Создан", cell: (user) => formatDate(user.createdAt) },
        ]}
        empty="Пользователей пока нет. Они появятся после запуска Telegram-бота."
        getKey={(user) => user.id}
        rows={users}
      />
    </section>
  );
}
