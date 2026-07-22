import Link from "next/link";
import { AdminPageHeader, formatDate } from "@/components/admin/data-table";
import ChatBotSubNav from "@/components/admin/chat-bot-subnav";
import { AdminPanel } from "@/components/admin/form";
import { fetchInternalAdminScenariosPageData } from "@/features/admin/scenarios/internal-admin-client";
import {
  loadAdminScenariosPageData,
  type AdminScenarioListRecord,
} from "@/features/admin/scenarios/service";
import { duplicateScenario } from "./actions";

export const dynamic = "force-dynamic";

function getStatusLabel(status: AdminScenarioListRecord["status"]) {
  switch (status) {
    case "active":
      return "Активен";
    case "disabled":
      return "Отключен";
    case "draft":
    default:
      return "Черновик";
  }
}

function getStatusBadgeClass(status: AdminScenarioListRecord["status"]) {
  switch (status) {
    case "active":
      return "border-[#1f6f43] bg-[#12261a] text-[#9ae6b4]";
    case "disabled":
      return "border-[#6b2430] bg-[#2a1218] text-[#fecaca]";
    case "draft":
    default:
      return "border-[#2a3a55] bg-[#192334] text-[#dbe3ef]";
  }
}

export default async function AdminScenariosPage() {
  const { scenarios } =
    process.env.APP_ROLE === "ingress"
      ? await fetchInternalAdminScenariosPageData()
      : await loadAdminScenariosPageData();

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <AdminPageHeader
          description="Собирайте переиспользуемые цепочки сообщений для триггеров без ручной миграции старых записей."
          title="Сценарии"
        />
        <Link
          className="inline-flex rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(124,92,255,0.28)] transition hover:bg-[#8d71ff]"
          href="/admin/scenarios/new"
        >
          Создать сценарий
        </Link>
      </header>

      <ChatBotSubNav />

      <AdminPanel className="space-y-4">
        <div>
          <h3 className="font-semibold text-[#f4f7fb]">Список сценариев</h3>
          <p className="mt-1 text-sm text-[#97a4b8]">
            Сценарий можно подключить к активному триггеру, продублировать и
            безопасно редактировать через структурированные шаги.
          </p>
        </div>

        {scenarios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#2a3a55] bg-[#0d1522] px-4 py-8 text-center text-sm text-[#97a4b8]">
            Сценариев пока нет. Создайте первый сценарий для будущих триггеров.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#223047] bg-[#0d1522]">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="bg-[#192334] text-xs uppercase text-[#97a4b8]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Сценарий</th>
                  <th className="px-4 py-3 font-semibold">Шаги</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 font-semibold">Обновлен</th>
                  <th className="px-4 py-3 font-semibold">Действие</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr className="border-t border-[#223047]/80" key={scenario.id}>
                    <td className="px-4 py-3 text-[#dbe3ef]">
                      <p className="font-medium text-[#f4f7fb]">{scenario.name}</p>
                      <p className="mt-1 text-xs text-[#97a4b8]">
                        {scenario.description || "Без описания"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#dbe3ef]">{scenario.stepCount}</td>
                    <td className="px-4 py-3 text-[#dbe3ef]">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                          scenario.status,
                        )}`}
                      >
                        {getStatusLabel(scenario.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#97a4b8]">
                      {formatDate(scenario.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-[#dbe3ef]">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                          href={`/admin/scenarios/${scenario.id}`}
                        >
                          Открыть
                        </Link>
                        <form action={duplicateScenario}>
                          <input name="id" type="hidden" value={scenario.id} />
                          <button
                            className="text-sm font-medium text-[#b9abff] transition hover:text-[#d8d2ff]"
                            type="submit"
                          >
                            Дублировать
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </section>
  );
}
