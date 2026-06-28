import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsagePage() {
  const usage = await prisma.usage.findMany({
    include: {
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
        description="AI token usage, costs, and response latency."
        title="Usage"
      />
      <DataTable
        columns={[
          {
            header: "User",
            cell: (row) => row.user.username ?? row.user.telegramId,
          },
          { header: "Feature", cell: (row) => row.feature },
          { header: "Input", cell: (row) => row.inputTokens },
          { header: "Output", cell: (row) => row.outputTokens },
          { header: "Cost", cell: (row) => `$${row.cost.toString()}` },
          { header: "Latency", cell: (row) => `${row.latency} ms` },
          { header: "Created", cell: (row) => formatDate(row.createdAt) },
        ]}
        empty="No usage records yet. Usage is recorded when AI features run."
        getKey={(row) => row.id}
        rows={usage}
      />
    </section>
  );
}
