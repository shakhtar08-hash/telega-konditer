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
    dynamicUserGroup: {
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
    dynamicUserGroupOptions = [],
    initial,
    submitLabel,
    title,
    userGroupOptions = [],
  }: {
    deleteAction?: unknown;
    dynamicUserGroupOptions?: Array<{ label: string; value: string }>;
    initial: { conditions: unknown[] };
    submitLabel: string;
    title: string;
    userGroupOptions?: Array<{ label: string; value: string }>;
  }) => (
    <div>
      {`trigger-form:${title}|${submitLabel}|delete:${String(Boolean(deleteAction))}|groups:${userGroupOptions
        .map((option) => `${option.label}:${option.value}`)
        .join(",")}|dynamic:${dynamicUserGroupOptions
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
    prismaMock.dynamicUserGroup.findMany.mockResolvedValue([]);
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
    expect(html).toContain("After Start: no promo");
    expect(html).toContain("Создать триггер");
  });

  it("shows filters and empty state", async () => {
    prismaMock.triggerRule.findMany.mockResolvedValue([]);

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

    expect(html).toContain("Применить");
    expect(html).toContain("Нет триггеров");
  });

  it("renders a compact filter layout with search above the selects", async () => {
    prismaMock.triggerRule.findMany.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain('class="space-y-3" method="get"');
    expect(html).toContain("md:max-w-[360px]");
    expect(html).toContain("md:max-w-[220px]");
  });

  it("passes live user and dynamic groups into the new trigger page form", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP клиенты" },
      { id: "group_school", name: "Ученики курса" },
    ]);
    prismaMock.dynamicUserGroup.findMany.mockResolvedValue([
      { id: "dynamic_no_tariff", name: "Без активного тарифа", status: "active" },
    ]);

    const html = renderToStaticMarkup(await NewTriggerPage({}));

    expect(html).toContain("Новый триггер");
    expect(html).toContain("groups:VIP клиенты:group_vip,Ученики курса:group_school");
    expect(html).toContain("dynamic:Без активного тарифа:dynamic_no_tariff");
  });

  it("passes live user groups and delete support into the edit trigger page form", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP клиенты" },
    ]);
    prismaMock.dynamicUserGroup.findMany.mockResolvedValue([
      { id: "dynamic_no_tariff", name: "Без активного тарифа", status: "active" },
    ]);
    prismaMock.triggerRule.findUnique.mockResolvedValue({
      conditions: [{ field: "dynamicUserGroupId", operator: "matches", value: "dynamic_no_tariff" }],
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
    expect(html).toContain("delete:true");
    expect(html).toContain("dynamic:Без активного тарифа:dynamic_no_tariff");
  });
  it("renders the new trigger page when dynamic groups are temporarily unavailable", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP РєР»РёРµРЅС‚С‹" },
    ]);
    prismaMock.dynamicUserGroup.findMany.mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'findMany')"),
    );

    const html = renderToStaticMarkup(await NewTriggerPage({}));

    expect(html).toContain("Новый триггер");
    expect(html).toContain("groups:VIP РєР»РёРµРЅС‚С‹:group_vip");
    expect(html).toContain("dynamic:");
  });

  it("renders the edit trigger page when dynamic groups are temporarily unavailable", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_vip", name: "VIP РєР»РёРµРЅС‚С‹" },
    ]);
    prismaMock.dynamicUserGroup.findMany.mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'findMany')"),
    );
    prismaMock.triggerRule.findUnique.mockResolvedValue({
      conditions: [],
      delayUnit: "now",
      delayValue: 0,
      eventKey: "user.started",
      id: "rule_group",
      imageUrl: null,
      messageText: "РџСЂРёРІРµС‚!",
      name: "VIP follow-up",
      status: "active",
    });

    const html = renderToStaticMarkup(
      await TriggerRulePage({
        params: Promise.resolve({ triggerId: "rule_group" }),
      }),
    );

    expect(html).toContain("Редактирование триггера");
    expect(html).toContain("delete:true");
    expect(html).toContain("dynamic:");
  });
});
