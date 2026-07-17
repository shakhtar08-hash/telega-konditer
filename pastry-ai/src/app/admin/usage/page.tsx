import {
  AdminPageHeader,
  DataTable,
  formatDate,
} from "@/components/admin/data-table";
import { fetchInternalAdminUsagePageData } from "@/features/admin/dashboard/internal-admin-client";
import { loadAdminUsagePageData } from "@/features/admin/dashboard/service";

export const dynamic = "force-dynamic";

interface UsageRow {
  id: string;
  feature: string;
  provider: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  cost: string;
  latency: number;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  user: {
    telegramId: string;
    username: string | null;
  };
}

export default async function AdminUsagePage() {
  const { usage } = process.env.APP_ROLE === "ingress"
    ? await fetchInternalAdminUsagePageData()
    : await loadAdminUsagePageData();

  function statusBadge(status: string) {
    if (status === "success") {
      return <span className="text-[#35d08b]">✓ Success</span>;
    }
    return <span className="text-[#f87171]">✗ Error</span>;
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Журнал AI-вызовов: провайдер, модель, токены, стоимость, статус."
        title="Использование"
      />
      <DataTable
        columns={[
          { header: "Пользователь", cell: (row: UsageRow) => row.user.username ?? row.user.telegramId },
          { header: "Функция", cell: (row: UsageRow) => row.feature },
          { header: "Провайдер", cell: (row: UsageRow) => row.provider || "—" },
          { header: "Модель", cell: (row: UsageRow) => row.model ?? "—" },
          { header: "Вход", cell: (row: UsageRow) => row.inputTokens },
          { header: "Выход", cell: (row: UsageRow) => row.outputTokens },
          { header: "Стоимость", cell: (row: UsageRow) => `$${row.cost}` },
          { header: "Задержка", cell: (row: UsageRow) => `${row.latency} ms` },
          { header: "Статус", cell: (row: UsageRow) => statusBadge(row.status) },
          {
            header: "Ошибка",
            cell: (row: UsageRow) =>
              row.errorMessage ? (
                <span title={row.errorMessage}>
                  {row.errorMessage.length > 80
                    ? `${row.errorMessage.slice(0, 80)}...`
                    : row.errorMessage}
                </span>
              ) : (
                "—"
              ),
          },
          { header: "Создано", cell: (row: UsageRow) => formatDate(row.createdAt) },
        ]}
        empty="Записей использования пока нет. Они появятся после запуска AI-функций."
        getKey={(row: UsageRow) => row.id}
        rows={usage as UsageRow[] as never}
      />
    </section>
  );
}
