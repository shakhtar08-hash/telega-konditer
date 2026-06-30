import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

function preview(content: string) {
  return content.length > 90 ? `${content.slice(0, 90)}...` : content;
}

export default async function AdminHistoryPage() {
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        select: {
          content: true,
          createdAt: true,
          model: true,
          role: true,
        },
        take: 1,
      },
      user: {
        select: {
          telegramId: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

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
