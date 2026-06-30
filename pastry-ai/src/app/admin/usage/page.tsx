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
        description="Использование токенов, расходы и задержка ответов AI."
        title="Использование"
      />
      <DataTable
        columns={[
          {
            header: "Пользователь",
            cell: (row) => row.user.username ?? row.user.telegramId,
          },
          { header: "Функция", cell: (row) => row.feature },
          { header: "Вход", cell: (row) => row.inputTokens },
          { header: "Выход", cell: (row) => row.outputTokens },
          { header: "Стоимость", cell: (row) => `$${row.cost.toString()}` },
          { header: "Задержка", cell: (row) => `${row.latency} ms` },
          { header: "Создано", cell: (row) => formatDate(row.createdAt) },
        ]}
        empty="Записей использования пока нет. Они появятся после запуска AI-функций."
        getKey={(row) => row.id}
        rows={usage}
      />
    </section>
  );
}
