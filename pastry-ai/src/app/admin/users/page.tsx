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
import { revalidatePath } from "next/cache";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { deleteUser } from "./actions";

export const dynamic = "force-dynamic";

export async function updateUserTariff(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const tariffPlanId = String(formData.get("tariffPlanId") ?? "");
  const expiresAtValue = String(formData.get("expiresAt") ?? "").trim();
  const tokensValue = String(formData.get("tokens") ?? "").trim();

  if (!id) {
    return;
  }

  if (!tariffPlanId) {
    await prisma.userTariff.deleteMany({
      where: { userId: id },
    });
    revalidatePath("/admin/users");
    return;
  }

  const tariffPlan = await prisma.tariffPlan.findUnique({
    where: { id: tariffPlanId },
    select: {
      durationDays: true,
      id: true,
      tokenAmount: true,
    },
  });

  if (!tariffPlan) {
    return;
  }

  const remainingTokens =
    tokensValue === "" ? tariffPlan.tokenAmount : Number(tokensValue);
  const expiresAt =
    expiresAtValue === ""
      ? getDefaultTariffExpiryDate(tariffPlan.durationDays)
      : new Date(expiresAtValue);

  if (
    !Number.isFinite(remainingTokens) ||
    remainingTokens < 0 ||
    Number.isNaN(expiresAt.getTime())
  ) {
    return;
  }

  const existingTariff = await prisma.userTariff.findUnique({
    where: { userId: id },
    select: { id: true },
  });

  if (existingTariff) {
    await prisma.userTariff.update({
      where: { userId: id },
      data: {
        expiresAt,
        remainingTokens,
        tariffPlanId,
      },
    });
  } else {
    await prisma.userTariff.create({
      data: {
        expiresAt,
        remainingTokens,
        startedAt: new Date(),
        tariffPlanId,
        userId: id,
      },
    });
  }

  revalidatePath("/admin/users");
}

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

function getDefaultTariffExpiryDate(durationDays: number) {
  return new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
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