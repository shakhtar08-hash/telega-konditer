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
          {
            header: "Текущий уровень",
            cell: (user) => getPlanLabel(user.plan),
          },
          { header: "Кредиты", cell: (user) => user.credits },
          { header: "Создан", cell: (user) => formatDate(user.createdAt) },
        ]}
        empty="Пользователей пока нет. Они появятся после запуска Telegram-бота."
        getKey={(user) => user.id}
        rows={users}
      />
    </section>
  );
}
