import Link from "next/link";
import {
  Bot,
  Brain,
  ChartNoAxesCombined,
  CreditCard,
  Gauge,
  Images,
  LayoutDashboard,
  Mail,
  MessageCircle,
  NotebookText,
  Settings,
  SlidersHorizontal,
  Timer,
  Users,
} from "lucide-react";

export const adminSections = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/chat-bot", label: "Чат-бот" },
  { href: "/admin/triggers", label: "Триггеры" },
  { href: "/admin/funnel", label: "Рассылки" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/tariffs", label: "Тарифы" },
  { href: "/admin/photo-styles", label: "Стили фото" },
  { href: "/admin/prompts", label: "База знаний" },
  { href: "/admin/settings", label: "AI-настройки" },
  { href: "/admin/history", label: "Диалоги" },
  { href: "/admin/usage", label: "Финансы" },
  { href: "/admin/usage", label: "Логи и события" },
  { href: "/admin/settings", label: "Настройки" },
] as const;

const sectionIcons = [
  LayoutDashboard,
  Bot,
  Timer,
  Mail,
  Users,
  CreditCard,
  Images,
  NotebookText,
  Brain,
  MessageCircle,
  ChartNoAxesCombined,
  Gauge,
  SlidersHorizontal,
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b111a] text-[#eef4ff]">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[#223047] bg-[#0d1522] px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-lg bg-[#fee6d4] text-xl">
            🍰
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI Кондитер</h1>
            <p className="text-xs text-[#97a4b8]">Админ-панель</p>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {adminSections.map((section, index) => {
            const Icon = sectionIcons[index] ?? Settings;

            return (
              <Link
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-[#97a4b8] transition hover:bg-[#192334] hover:text-[#eef4ff] first:bg-[#7257ff] first:text-white"
                href={section.href}
                key={`${section.href}-${section.label}`}
              >
                <Icon className="size-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>
        <form action="/api/admin/logout" className="mt-8" method="post">
          <button
            className="w-full rounded-md px-3 py-2 text-left text-sm text-[#97a4b8] hover:bg-[#192334] hover:text-[#eef4ff]"
            type="submit"
          >
            Выйти
          </button>
        </form>
      </aside>
      <main className="px-4 py-5 lg:ml-60 lg:px-7">{children}</main>
    </div>
  );
}
