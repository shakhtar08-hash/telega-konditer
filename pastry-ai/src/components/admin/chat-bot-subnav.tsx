"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const subNavItems = [
  { href: "/admin/chat-bot", label: "Меню" },
  { href: "/admin/triggers", label: "Триггеры" },
  { href: "/admin/scenarios", label: "Сценарии" },
  { href: "/admin/funnel", label: "Воронка" },
] as const;

export default function ChatBotSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b border-[#223047] text-sm">
      {subNavItems.map((item) => {
        const active = pathname === item.href;

        return active ? (
          <span
            className="border-b-2 border-[#7257ff] px-3 py-2 font-medium text-[#d8d2ff]"
            key={item.href}
          >
            {item.label}
          </span>
        ) : (
          <Link
            className="px-3 py-2 text-[#63718a] transition hover:text-[#97a4b8]"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
