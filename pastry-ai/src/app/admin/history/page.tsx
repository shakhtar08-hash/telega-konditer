import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import { fetchInternalAdminHistoryPageData } from "@/features/admin/dashboard/internal-admin-client";
import { loadAdminHistoryPageData } from "@/features/admin/dashboard/service";

export const dynamic = "force-dynamic";

function preview(content: string) {
  return content.length > 90 ? `${content.slice(0, 90)}...` : content;
}

export default async function AdminHistoryPage() {
  const { conversations } = process.env.APP_ROLE === "ingress"
    ? await fetchInternalAdminHistoryPageData()
    : await loadAdminHistoryPageData();

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Последние диалоги бота и последнее сообщение в каждой ветке."
        title="История"
      />
      <DataTable
        columns={[
          {
            header: "Пользователь",
            cell: (conversation) =>
              conversation.user.username ?? conversation.user.telegramId,
          },
          { header: "Функция", cell: (conversation) => conversation.feature },
          {
            header: "Роль",
            cell: (conversation) => conversation.messages[0]?.role ?? "-",
          },
          {
            header: "Последнее сообщение",
            cell: (conversation) =>
              preview(conversation.messages[0]?.content ?? "Нет сообщений"),
          },
          {
            header: "Модель",
            cell: (conversation) => conversation.messages[0]?.model ?? "-",
          },
          {
            header: "Создан",
            cell: (conversation) => formatDate(conversation.createdAt),
          },
        ]}
        empty="Истории диалогов пока нет. Взаимодействия с ботом появятся здесь."
        getKey={(conversation) => conversation.id}
        rows={conversations}
      />
    </section>
  );
}
