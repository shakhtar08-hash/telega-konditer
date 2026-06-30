import { describe, expect, it } from "vitest";
import { adminSections } from "./layout";

describe("adminSections", () => {
  it("contains the required admin pages", () => {
    expect(adminSections.map((section) => section)).toEqual([
      { href: "/admin", label: "Панель" },
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/prompts", label: "Промпты" },
      { href: "/admin/funnel", label: "Воронка" },
      { href: "/admin/photo-styles", label: "Фото-стили" },
      { href: "/admin/carousel-templates", label: "Шаблоны каруселей" },
      { href: "/admin/history", label: "История" },
      { href: "/admin/usage", label: "Использование" },
      { href: "/admin/settings", label: "Настройки" },
    ]);
  });
});
