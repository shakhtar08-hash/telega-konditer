import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    triggerRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userGroup: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/components/admin/chat-bot-subnav", () => ({
  default: () => "<nav>subnav</nav>",
}));

vi.mock("./trigger-form", () => ({
  TriggerForm: ({
    deleteAction,
    initial,
    submitLabel,
    title,
    userGroupOptions = [],
  }: {
    deleteAction?: unknown;
    initial: { conditions: unknown[] };
    submitLabel: string;
    title: string;
    userGroupOptions?: Array<{ label: string; value: string }>;
  }) => (
    <div>
      {`trigger-form:${title}|${submitLabel}|delete:${String(Boolean(deleteAction))}|groups:${userGroupOptions
        .map((option) => `${option.label}:${option.value}`)
        .join(",")}|conditions:${initial.conditions.length}`}
    </div>
  ),
}));

import AdminTriggersPage from "./page";
import NewTriggerPage from "./new/page";
import TriggerRulePage from "./[triggerId]/page";

describe("trigger admin pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.userGroup.findMany.mockResolvedValue([]);
  });

  it("renders the triggers screen in Russian", async () => {
    prismaMock.triggerRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        name: "After Start: no promo",
        eventKey: "user.started",
        status: "active",
        delayValue: 15,
        delayUnit: "minutes",
        messageText: "Hello!",
        imageUrl: null,
        buttons: null,
        conditions: [],
        createdAt: new Date("2026-07-10T10:00:00.000Z"),
        updatedAt: new Date("2026-07-10T10:00:00.000Z"),
      },
    ]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("Триггеры");
    expect(html).toContain("Готовые шаблоны");
    expect(html).toContain("After Start: no promo");
    expect(html).toContain("Нажал Start - Через 15 минут");
    expect(html).toContain("Создать триггер");
  });

  it("shows Russian filters and empty state", async () => {
    prismaMock.triggerRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        name: "After Start: no promo",
        eventKey: "user.started",
        status: "active",
        delayValue: 15,
        delayUnit: "minutes",
        messageText: "Hello!",
        imageUrl: null,
        buttons: null,
        conditions: [],
        createdAt: new Date("2026-07-10T10:00:00.000Z"),
        updatedAt: new Date("2026-07-10T10:00:00.000Z"),
      },
      {
        id: "rule_2",
        name: "Promo expired",
        eventKey: "promo.expired",
        status: "draft",
        delayValue: 5,
        delayUnit: "minutes",
        messageText: "Come back!",
        imageUrl: null,
        buttons: null,
        conditions: [],
        createdAt: new Date("2026-07-11T10:00:00.000Z"),
        updatedAt: new Date("2026-07-11T10:00:00.000Z"),
      },
    ]);

    const html = renderToStaticMarkup(
      await AdminTriggersPage({
        searchParams: Promise.resolve({
          event: "tariff.paid",
          status: "disabled",
          search: "missing",
          sort: "name-asc",
        }),
      }),
    );

    expect(html).toContain("Найти триггер");
    expect(html).toContain("Все статусы");
    expect(html).toContain("Применить");
    expect(html).toContain("Нет триггеров");
    expect(html).not.toContain("/admin/triggers/rule_1");
    expect(html).not.toContain("/admin/triggers/rule_2");
  });

  it("renders user group conditions with resolved Russian labels", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP клиенты" },
    ]);
    prismaMock.triggerRule.findMany.mockResolvedValue([
      {
        id: "rule_group",
        name: "VIP follow-up",
        eventKey: "user.started",
        status: "active",
        delayValue: 0,
        delayUnit: "now",
        messageText: "Hello!",
        imageUrl: null,
        buttons: null,
        conditions: [{ field: "userGroupId", operator: "isMember", value: "group_vip" }],
        createdAt: new Date("2026-07-11T10:00:00.000Z"),
        updatedAt: new Date("2026-07-11T10:00:00.000Z"),
      },
    ]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("Состоит в группе: VIP клиенты");
  });

  it("passes live user groups into the new trigger page form", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP клиенты" },
      { id: "group_school", name: "Ученики курса" },
    ]);

    const html = renderToStaticMarkup(await NewTriggerPage({}));

    expect(html).toContain("Новый триггер");
    expect(html).toContain("trigger-form:Новый триггер|Создать триггер|delete:false");
    expect(html).toContain("groups:VIP клиенты:group_vip,Ученики курса:group_school");
  });

  it("passes live user groups and delete support into the edit trigger page form", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP клиенты" },
    ]);
    prismaMock.triggerRule.findUnique.mockResolvedValue({
      conditions: [{ field: "userGroupId", operator: "isMember", value: "group_vip" }],
      delayUnit: "now",
      delayValue: 0,
      eventKey: "user.started",
      id: "rule_group",
      imageUrl: null,
      messageText: "Привет!",
      name: "VIP follow-up",
      status: "active",
    });

    const html = renderToStaticMarkup(
      await TriggerRulePage({
        params: Promise.resolve({ triggerId: "rule_group" }),
      }),
    );

    expect(html).toContain("Редактирование триггера");
    expect(html).toContain("trigger-form:Редактирование триггера|Сохранить изменения|delete:true");
    expect(html).toContain("groups:VIP клиенты:group_vip");
  });
});
