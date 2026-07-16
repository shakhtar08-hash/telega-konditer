"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartNoAxesCombined,
  CreditCard,
  Images,
  LayoutDashboard,
  MessageCircle,
  NotebookText,
  Settings,
  Users,
} from "lucide-react";

export const adminSections = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/chat-bot", label: "Чат-бот" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/user-groups", label: "Группы пользователей" },
  { href: "/admin/dynamic-user-groups", label: "Динамические группы" },
  { href: "/admin/tariffs", label: "Тарифы" },
  { href: "/admin/photo-styles", label: "Стили фото" },
  { href: "/admin/prompts", label: "Промпты" },
  { href: "/admin/history", label: "История" },
  { href: "/admin/usage", label: "Использование" },
  { href: "/admin/settings", label: "Настройки" },
] as const;

const sectionIcons = [
  LayoutDashboard,
  Bot,
  Users,
  Users,
  Users,
  CreditCard,
  Images,
  NotebookText,
  MessageCircle,
  ChartNoAxesCombined,
  Settings,
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (href === "/admin/chat-bot") {
    return (
      pathname.startsWith("/admin/chat-bot") ||
      pathname === "/admin/triggers" ||
      pathname === "/admin/funnel"
    );
  }
  return pathname.startsWith(href);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
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
          const active = isActive(section.href, pathname);

          return (
            <Link
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-[#192334] hover:text-[#eef4ff] ${
                active ? "bg-[#7257ff] text-white" : "text-[#97a4b8]"
              }`}
              href={section.href}
              key={section.href}
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
  );
}
