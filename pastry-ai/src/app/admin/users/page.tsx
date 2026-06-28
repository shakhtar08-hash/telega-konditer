import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

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
        description="Telegram users registered through the bot."
        title="Users"
      />
      <DataTable
        columns={[
          { header: "Telegram ID", cell: (user) => user.telegramId },
          {
            header: "Username",
            cell: (user) => user.username ?? user.name ?? "No name",
          },
          { header: "Plan", cell: (user) => user.plan },
          { header: "Credits", cell: (user) => user.credits },
          { header: "Created", cell: (user) => formatDate(user.createdAt) },
        ]}
        empty="No users yet. They will appear after someone starts the Telegram bot."
        getKey={(user) => user.id}
        rows={users}
      />
    </section>
  );
}
