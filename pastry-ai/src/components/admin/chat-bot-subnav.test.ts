import { describe, expect, it } from "vitest";

const subNavItems = [
  { href: "/admin/chat-bot", label: "Меню" },
  { href: "/admin/triggers", label: "Триггеры" },
  { href: "/admin/funnel", label: "Воронка" },
] as const;

function isSubActive(itemHref: string, pathname: string): boolean {
  return pathname === itemHref;
}

describe("ChatBotSubNav items", () => {
  it("has three items: Меню, Триггеры, Воронка", () => {
    expect(subNavItems.map((i) => i.label)).toEqual(["Меню", "Триггеры", "Воронка"]);
  });

  it("highlights Меню on /admin/chat-bot", () => {
    expect(isSubActive("/admin/chat-bot", "/admin/chat-bot")).toBe(true);
    expect(isSubActive("/admin/triggers", "/admin/chat-bot")).toBe(false);
    expect(isSubActive("/admin/funnel", "/admin/chat-bot")).toBe(false);
  });

  it("highlights Триггеры on /admin/triggers", () => {
    expect(isSubActive("/admin/triggers", "/admin/triggers")).toBe(true);
    expect(isSubActive("/admin/chat-bot", "/admin/triggers")).toBe(false);
    expect(isSubActive("/admin/funnel", "/admin/triggers")).toBe(false);
  });

  it("highlights Воронка on /admin/funnel", () => {
    expect(isSubActive("/admin/funnel", "/admin/funnel")).toBe(true);
    expect(isSubActive("/admin/chat-bot", "/admin/funnel")).toBe(false);
    expect(isSubActive("/admin/triggers", "/admin/funnel")).toBe(false);
  });
});
