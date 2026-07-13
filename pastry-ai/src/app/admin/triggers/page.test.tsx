import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    triggerRule: {
      findMany: vi.fn(),
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

import AdminTriggersPage from "./page";

describe("AdminTriggersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.userGroup.findMany.mockResolvedValue([]);
  });

  it("renders the templates panel and trigger table", async () => {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("Ready templates");
    expect(html).toContain("After Start: no promo");
    expect(html).toContain("Pressed Start - In 15 minutes");
    expect(html).not.toContain("onboarding");
    expect(html).not.toContain("В·");
    expect(html).toContain("Create trigger");
  });

  it("applies event and status filters to trigger rows", async () => {
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
          event: "user.started",
          status: "active",
          search: "After Start",
          sort: "name-asc",
        }),
      }),
    );

    expect(html).toContain("After Start: no promo");
    expect(html).toContain("/admin/triggers/rule_1");
    expect(html).not.toContain("/admin/triggers/rule_2");
    expect(html).toContain("Search triggers...");
  });

  it("renders user group conditions with business-friendly Russian labels", async () => {
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

    expect(html).toContain("Состоит в группе VIP клиенты");
  });
});
