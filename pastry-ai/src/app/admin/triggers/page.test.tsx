import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    triggerRule: {
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
});
