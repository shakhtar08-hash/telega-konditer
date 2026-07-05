import { describe, expect, it } from "vitest";
import { adminSections } from "./layout";

describe("adminSections", () => {
  it("contains the redesigned russian admin navigation", () => {
    expect(adminSections.map((section) => section)).toEqual([
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
    ]);
  });
});
