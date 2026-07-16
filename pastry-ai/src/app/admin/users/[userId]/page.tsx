import Link from "next/link";
import { AdminPageHeader, formatDate } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
} from "@/components/admin/form";
import { prisma } from "@/db/prisma";
import { listMatchingDynamicUserGroupsForUser } from "@/features/dynamic-user-groups/service";
import {
  addUserToGroup,
  removeUserFromGroup,
  updateUserTariff,
} from "../actions";

export const dynamic = "force-dynamic";

type AdminUserDetailPageProps = {
  params: Promise<{ userId: string }> | { userId: string };
};

type UserGroupRecord = {
  id: string;
  name: string;
};

type TariffPlanRecord = {
  id: string;
  name: string;
  slug: string;
};

type UserRecord = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
  promoClaimed: boolean;
  createdAt: Date;
  userTariff:
    | {
        expiresAt: Date;
        remainingTokens: number;
        tariffPlan: {
          id: string;
          name: string;
          slug: string;
        };
      }
    | null;
  groupMemberships: Array<{
    createdAt: Date;
    userGroupId: string;
    userGroup: UserGroupRecord;
  }>;
};

function formatDateTimeLocalValue(date?: Date) {
  return date ? date.toISOString().slice(0, 16) : "";
}

function getUserDisplayName(user: UserRecord) {
  return user.username || user.name || "Без имени";
}

function getTariffStatusLabel(userTariff: UserRecord["userTariff"]) {
  if (!userTariff) {
    return "Без подписки";
  }

  if (userTariff.expiresAt <= new Date()) {
    return `Истёк: ${userTariff.tariffPlan.name}`;
  }

  return userTariff.tariffPlan.name;
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const resolvedParams = await params;

  const [user, groups, tariffPlans, matchingDynamicGroups] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: resolvedParams.userId },
      include: {
        userTariff: {
          include: {
            tariffPlan: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        groupMemberships: {
          include: {
            userGroup: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }) as Promise<UserRecord>,
    prisma.userGroup.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }) as Promise<UserGroupRecord[]>,
    prisma.tariffPlan.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }) as Promise<TariffPlanRecord[]>,
    listMatchingDynamicUserGroupsForUser(resolvedParams.userId),
  ]);

  const membershipIds = new Set(
    user.groupMemberships.map((membership) => membership.userGroupId),
  );
  const availableGroups = groups.filter((group) => !membershipIds.has(group.id));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          description="Профиль пользователя, тариф, ручные и динамические группы для сегментации."
          title={getUserDisplayName(user)}
        />
        <Link
          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
          href="/admin/users"
        >
          Ко всем пользователям
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <AdminPanel className="space-y-3">
            <h3 className="text-lg font-semibold text-[#f4f7fb]">
              Данные пользователя
            </h3>
            <dl className="space-y-2 text-sm text-[#dbe3ef]">
              <div>
                <dt className="text-[#97a4b8]">Telegram ID</dt>
                <dd>{user.telegramId}</dd>
              </div>
              <div>
                <dt className="text-[#97a4b8]">Username</dt>
                <dd>{user.username || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#97a4b8]">Имя</dt>
                <dd>{user.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-[#97a4b8]">Промо получено</dt>
                <dd>{user.promoClaimed ? "Да" : "Нет"}</dd>
              </div>
              <div>
                <dt className="text-[#97a4b8]">Создан</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel>
            <form action={updateUserTariff} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#f4f7fb]">Тариф</h3>
                <p className="text-sm text-[#97a4b8]">
                  Текущий статус: {getTariffStatusLabel(user.userTariff)}
                </p>
              </div>

              <input name="id" type="hidden" value={user.id} />

              <AdminField label="Тарифный план">
                <AdminSelect
                  defaultValue={user.userTariff?.tariffPlan.id ?? ""}
                  name="tariffPlanId"
                >
                  <option value="">Без подписки</option>
                  {tariffPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>

              <div className="grid gap-3 md:grid-cols-2">
                <AdminField label="Токены">
                  <AdminInput
                    defaultValue={user.userTariff?.remainingTokens ?? ""}
                    min="0"
                    name="tokens"
                    placeholder="Токены"
                    type="number"
                  />
                </AdminField>

                <AdminField label="Действует до">
                  <AdminInput
                    defaultValue={formatDateTimeLocalValue(user.userTariff?.expiresAt)}
                    name="expiresAt"
                    type="datetime-local"
                  />
                </AdminField>
              </div>

              <AdminButton type="submit" variant="secondary">
                Сохранить тариф
              </AdminButton>
            </form>
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7fb]">Динамические группы</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Виртуальные сегменты, под которые пользователь подходит прямо сейчас.
              </p>
            </div>

            {matchingDynamicGroups.length === 0 ? (
              <p className="text-sm text-[#97a4b8]">
                Сейчас пользователь не попадает ни в одну динамическую группу.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-[#dbe3ef]">
                {matchingDynamicGroups.map((group) => (
                  <li
                    className="rounded-lg border border-[#223047] bg-[#0d1522] px-3 py-2"
                    key={group.id}
                  >
                    {group.name}
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>

        <div className="space-y-4">
          <AdminPanel className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7fb]">
                Группы пользователя
              </h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Ручные сегменты, которые можно использовать в триггерах и административных сценариях.
              </p>
            </div>

            {user.groupMemberships.length === 0 ? (
              <p className="text-sm text-[#97a4b8]">
                Пользователь пока не добавлен ни в одну группу.
              </p>
            ) : (
              <div className="space-y-3">
                {user.groupMemberships.map((membership) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                    key={membership.userGroupId}
                  >
                    <div>
                      <p className="font-medium text-[#f4f7fb]">
                        {membership.userGroup.name}
                      </p>
                      <p className="mt-1 text-xs text-[#97a4b8]">
                        Добавлено {formatDate(membership.createdAt)}
                      </p>
                    </div>

                    <form action={removeUserFromGroup}>
                      <input name="userId" type="hidden" value={user.id} />
                      <input
                        name="userGroupId"
                        type="hidden"
                        value={membership.userGroupId}
                      />
                      <AdminButton type="submit" variant="danger">
                        Удалить из группы
                      </AdminButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7fb]">
                Добавить группу
              </h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Назначьте пользователю одну из доступных ручных групп.
              </p>
            </div>

            {availableGroups.length === 0 ? (
              <p className="text-sm text-[#97a4b8]">
                Все существующие группы уже назначены этому пользователю.
              </p>
            ) : (
              <form action={addUserToGroup} className="flex flex-wrap gap-2">
                <input name="userId" type="hidden" value={user.id} />
                <AdminSelect className="min-w-52" name="userGroupId">
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </AdminSelect>
                <AdminButton type="submit" variant="secondary">
                  Добавить группу
                </AdminButton>
              </form>
            )}
          </AdminPanel>
        </div>
      </div>
    </section>
  );
}
