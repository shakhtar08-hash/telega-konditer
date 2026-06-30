import Link from "next/link";

export const adminSections = [
  { href: "/admin", label: "Панель" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/prompts", label: "Промпты" },
  { href: "/admin/funnel", label: "Воронка" },
  { href: "/admin/photo-styles", label: "Фото-стили" },
  { href: "/admin/carousel-templates", label: "Шаблоны каруселей" },
  { href: "/admin/history", label: "История" },
  { href: "/admin/usage", label: "Использование" },
  { href: "/admin/settings", label: "Настройки" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-white p-6 md:block">
        <h1 className="text-lg font-semibold">Pastry AI</h1>
        <nav className="mt-8 flex flex-col gap-1">
          {adminSections.map((section) => (
            <Link
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              href={section.href}
              key={section.href}
            >
              {section.label}
            </Link>
          ))}
        </nav>
        <form action="/api/admin/logout" className="mt-8" method="post">
          <button className="rounded-md px-3 py-2 text-sm hover:bg-muted" type="submit">
            Выйти
          </button>
        </form>
      </aside>
      <main className="px-5 py-6 md:ml-64 md:px-8">{children}</main>
    </div>
  );
}
