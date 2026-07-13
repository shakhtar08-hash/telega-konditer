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
  it("highlights Дашборд on /admin", () => {
    expect(isActive("/admin", "/admin")).toBe(true);
  });

  it("does not highlight Дашборд on /admin/chat-bot", () => {
    expect(isActive("/admin", "/admin/chat-bot")).toBe(false);
  });

  it("highlights Чат-бот on /admin/chat-bot", () => {
    expect(isActive("/admin/chat-bot", "/admin/chat-bot")).toBe(true);
  });

  it("highlights Чат-бот on /admin/triggers", () => {
    expect(isActive("/admin/chat-bot", "/admin/triggers")).toBe(true);
  });

  it("highlights Чат-бот on /admin/funnel", () => {
    expect(isActive("/admin/chat-bot", "/admin/funnel")).toBe(true);
  });

  it("highlights Промты on /admin/prompts", () => {
    const section = adminSections.find((s) => s.label === "Промты");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/prompts")).toBe(true);
  });

  it("highlights Пользователи on /admin/users", () => {
    const section = adminSections.find((s) => s.label === "Пользователи");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/users")).toBe(true);
  });

  it("highlights Тарифы on /admin/tariffs", () => {
    const section = adminSections.find((s) => s.label === "Тарифы");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/tariffs")).toBe(true);
  });

  it("highlights Стили фото on /admin/photo-styles", () => {
    const section = adminSections.find((s) => s.label === "Стили фото");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/photo-styles")).toBe(true);
  });

  it("highlights История on /admin/history", () => {
    const section = adminSections.find((s) => s.label === "История");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/history")).toBe(true);
  });

  it("highlights Использование on /admin/usage", () => {
    const section = adminSections.find((s) => s.label === "Использование");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/usage")).toBe(true);
  });

  it("highlights Настройки on /admin/settings", () => {
    const section = adminSections.find((s) => s.label === "Настройки");
    expect(section).toBeDefined();
    expect(isActive(section!.href, "/admin/settings")).toBe(true);
  });
  it("includes and highlights Группы пользователей on /admin/user-groups", () => {
    const section = adminSections.find((s) => s.label === "Группы пользователей");
    expect(section).toBeDefined();
    expect(section?.href).toBe("/admin/user-groups");
    expect(isActive(section!.href, "/admin/user-groups")).toBe(true);
  });
});
