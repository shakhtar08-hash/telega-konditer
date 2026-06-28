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
        description="Recent bot conversations and the latest message in each thread."
        title="History"
      />
      <DataTable
        columns={[
          {
            header: "User",
            cell: (conversation) =>
              conversation.user.username ?? conversation.user.telegramId,
          },
          { header: "Feature", cell: (conversation) => conversation.feature },
          {
            header: "Role",
            cell: (conversation) => conversation.messages[0]?.role ?? "-",
          },
          {
            header: "Latest message",
            cell: (conversation) =>
              preview(conversation.messages[0]?.content ?? "No messages"),
          },
          {
            header: "Model",
            cell: (conversation) => conversation.messages[0]?.model ?? "-",
          },
          {
            header: "Created",
            cell: (conversation) => formatDate(conversation.createdAt),
          },
        ]}
        empty="No conversation history yet. Bot interactions will appear here."
        getKey={(conversation) => conversation.id}
        rows={conversations}
      />
    </section>
  );
}
