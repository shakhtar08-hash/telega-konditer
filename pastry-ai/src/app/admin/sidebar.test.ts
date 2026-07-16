import { describe, expect, it } from "vitest";
import { adminSections } from "./sidebar";

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

describe("sidebar isActive", () => {
  it("highlights dashboard only on /admin", () => {
    expect(isActive("/admin", "/admin")).toBe(true);
    expect(isActive("/admin", "/admin/chat-bot")).toBe(false);
  });

  it("highlights chat-bot group routes", () => {
    expect(isActive("/admin/chat-bot", "/admin/chat-bot")).toBe(true);
    expect(isActive("/admin/chat-bot", "/admin/triggers")).toBe(true);
    expect(isActive("/admin/chat-bot", "/admin/funnel")).toBe(true);
  });

  it("highlights standalone admin sections including dynamic groups", () => {
    const expectations = [
      { href: "/admin/prompts", label: "Промпты" },
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/user-groups", label: "Группы пользователей" },
      { href: "/admin/dynamic-user-groups", label: "Динамические группы" },
      { href: "/admin/tariffs", label: "Тарифы" },
      { href: "/admin/photo-styles", label: "Стили фото" },
      { href: "/admin/history", label: "История" },
      { href: "/admin/usage", label: "Использование" },
      { href: "/admin/settings", label: "Настройки" },
    ] as const;

    for (const expectation of expectations) {
      const section = adminSections.find((item) => item.label === expectation.label);
      expect(section?.href).toBe(expectation.href);
      expect(isActive(expectation.href, expectation.href)).toBe(true);
    }
  });
});
