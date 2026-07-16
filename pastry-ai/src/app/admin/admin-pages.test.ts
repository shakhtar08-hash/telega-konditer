import { describe, expect, it } from "vitest";
import { adminSections } from "./sidebar";

describe("adminSections", () => {
  it("contains the new admin navigation with renamed and removed items", () => {
    expect(adminSections.map((section) => section)).toEqual([
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
    ]);
  });

  it("no longer contains AI-настройки", () => {
    const labels = adminSections.map((s) => s.label);
    expect(labels).not.toContain("AI-настройки");
  });

  it("no longer contains Триггеры as a separate sidebar item", () => {
    const labels = adminSections.map((s) => s.label);
    expect(labels).not.toContain("Триггеры");
  });

  it("no longer contains Рассылки as a separate sidebar item", () => {
    const labels = adminSections.map((s) => s.label);
    expect(labels).not.toContain("Рассылки");
  });

  it("renames База знаний to Промпты", () => {
    const labels = adminSections.map((s) => s.label);
    expect(labels).toContain("Промпты");
    expect(labels).not.toContain("База знаний");
  });
});
