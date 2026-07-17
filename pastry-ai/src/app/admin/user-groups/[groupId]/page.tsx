import Link from "next/link";
import { AdminPageHeader, formatDate } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/form";
import {
  fetchInternalAdminUserGroupDetailPageData,
} from "@/features/admin/groups/internal-admin-client";
import { loadAdminUserGroupDetailPageData } from "@/features/admin/groups/service";
import { addUserToGroup, removeUserFromGroup, updateUserGroup } from "../actions";

export const dynamic = "force-dynamic";

type AdminUserGroupPageProps = {
  params: Promise<{ groupId: string }> | { groupId: string };
  searchParams?: Promise<{ search?: string }> | { search?: string };
};

type GroupRecord = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
};

type GroupMemberRecord = {
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    name: string | null;
  };
};

type CandidateUserRecord = {
  id: string;
  telegramId: string;
  username: string | null;
  name: string | null;
};

function getUserLabel(user: CandidateUserRecord | GroupMemberRecord["user"]) {
  return user.username || user.name || "Без имени";
}

export default async function AdminUserGroupPage({
  params,
  searchParams,
}: AdminUserGroupPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const search = resolvedSearchParams.search?.trim() || "";

  const { candidateUsers, group, members } = process.env.APP_ROLE === "ingress"
    ? ((await fetchInternalAdminUserGroupDetailPageData(
        resolvedParams.groupId,
        search,
      )) as {
        group: GroupRecord;
        members: GroupMemberRecord[];
        candidateUsers: CandidateUserRecord[];
      })
    : ((await loadAdminUserGroupDetailPageData(resolvedParams.groupId, search)) as {
        group: GroupRecord;
        members: GroupMemberRecord[];
        candidateUsers: CandidateUserRecord[];
      });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          description={group.description || "Ручная группа пользователей для сегментации."}
          title={group.name}
        />
        <Link
          href="/admin/user-groups"
          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
        >
          Ко всем группам
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <AdminPanel>
            <form action={updateUserGroup} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#f4f7fb]">Параметры группы</h3>
                <p className="text-sm text-[#97a4b8]">Обновлено {formatDate(group.updatedAt)}.</p>
              </div>

              <input name="id" type="hidden" value={group.id} />

              <AdminField label="Название группы">
                <AdminInput defaultValue={group.name} name="name" required />
              </AdminField>

              <AdminField label="Описание">
                <AdminTextarea defaultValue={group.description || ""} name="description" />
              </AdminField>

              <AdminButton type="submit" variant="secondary">
                Сохранить группу
              </AdminButton>
            </form>
          </AdminPanel>

          <AdminPanel className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7fb]">Участники группы</h3>
              <p className="mt-1 text-sm text-[#97a4b8]">
                Текущие пользователи, которым вручную назначена эта группа.
              </p>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-[#97a4b8]">В этой группе пока нет участников.</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                    key={member.userId}
                  >
                    <div>
                      <p className="font-medium text-[#f4f7fb]">{getUserLabel(member.user)}</p>
                      <p className="mt-1 text-xs text-[#97a4b8]">
                        Telegram ID: {member.user.telegramId}
                      </p>
                    </div>

                    <form action={removeUserFromGroup}>
                      <input name="userId" type="hidden" value={member.userId} />
                      <input name="userGroupId" type="hidden" value={group.id} />
                      <AdminButton type="submit" variant="danger">
                        Удалить из группы
                      </AdminButton>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>

        <AdminPanel className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#f4f7fb]">Добавить пользователя</h3>
            <p className="mt-1 text-sm text-[#97a4b8]">
              Найдите пользователя и добавьте его в эту группу без перехода на другие экраны.
            </p>
          </div>

          <form className="flex flex-wrap items-end gap-3" method="get">
            <AdminField label="Поиск пользователя">
              <AdminInput
                defaultValue={search}
                name="search"
                placeholder="Поиск по Telegram ID, username или имени"
              />
            </AdminField>
            <AdminButton type="submit" variant="secondary">
              Найти
            </AdminButton>
          </form>

          {candidateUsers.length === 0 ? (
            <p className="text-sm text-[#97a4b8]">
              {search
                ? "По запросу никто не найден."
                : "Введите запрос, чтобы найти пользователя для группы."}
            </p>
          ) : (
            <div className="space-y-3">
              {candidateUsers.map((user) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#223047] bg-[#0d1522] p-3"
                  key={user.id}
                >
                  <div>
                    <p className="font-medium text-[#f4f7fb]">{getUserLabel(user)}</p>
                    <p className="mt-1 text-xs text-[#97a4b8]">
                      Telegram ID: {user.telegramId}
                    </p>
                  </div>

                  <form action={addUserToGroup}>
                    <input name="userId" type="hidden" value={user.id} />
                    <input name="userGroupId" type="hidden" value={group.id} />
                    <AdminButton type="submit">Добавить в группу</AdminButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </section>
  );
}
