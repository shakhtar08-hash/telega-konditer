import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    triggerMessage: {
      findMany: vi.fn(),
    },
    tariffPlan: {
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
    prismaMock.tariffPlan.findMany.mockResolvedValue([{ slug: "promo", name: "Промо" }]);
  });

  it("renders trigger rules grouped by slug", async () => {
    prismaMock.triggerMessage.findMany.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое",
        imageUrl: null,
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "t2",
        slug: "after-start",
        title: "60 мин",
        text: "Второе",
        imageUrl: null,
        delayMinutes: 60,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("after-start");
    expect(html).toContain("15 мин");
    expect(html).toContain("60 мин");
    expect(html).toContain("Добавить сообщение в правило");
  });

  it("renders multiple rule groups with independent slugs", async () => {
    prismaMock.triggerMessage.findMany.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое",
        imageUrl: null,
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "t2",
        slug: "after-payment",
        title: "После оплаты",
        text: "Спасибо",
        imageUrl: null,
        delayMinutes: 10,
        targetPlans: ["pastry-chef"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("after-start");
    expect(html).toContain("after-payment");
    expect(html).toContain("Создать правило");
  });

  it("shows slug as non-editable in rule groups", async () => {
    prismaMock.triggerMessage.findMany.mockResolvedValue([
      {
        id: "t1",
        slug: "after-start",
        title: "15 мин",
        text: "Первое",
        imageUrl: null,
        delayMinutes: 15,
        targetPlans: ["promo"],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const html = renderToStaticMarkup(await AdminTriggersPage({}));

    expect(html).toContain("after-start");
    expect(html).toContain("slug не редактируется");
  });
});