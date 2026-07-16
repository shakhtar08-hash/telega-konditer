import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    dynamicUserGroup: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

import AdminDynamicUserGroupsPage from "./page";

describe("AdminDynamicUserGroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dynamic groups list", async () => {
    prismaMock.dynamicUserGroup.findMany.mockResolvedValue([
      {
        id: "group_new",
        name: "Без активного тарифа",
        description: "Пользователи без оплаты",
        status: "active",
        logicOperator: "AND",
        conditionsJson: [{ field: "hasActiveTariff", operator: "is", value: false }],
        updatedAt: new Date("2026-07-14T08:00:00.000Z"),
      },
    ]);
    prismaMock.dynamicUserGroup.findUnique.mockResolvedValue({
      id: "group_new",
      name: "Без активного тарифа",
      description: "Пользователи без оплаты",
      status: "active",
      logicOperator: "AND",
      conditionsJson: [{ field: "hasActiveTariff", operator: "is", value: false }],
      createdAt: new Date("2026-07-14T08:00:00.000Z"),
      updatedAt: new Date("2026-07-14T08:00:00.000Z"),
    });
    prismaMock.user.findMany.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminDynamicUserGroupsPage());

    expect(html).toContain("Динамические группы");
    expect(html).toContain("Без активного тарифа");
    expect(html).toContain("Создать группу");
  });

  it("renders a fallback state when the dynamic group table is missing", async () => {
    prismaMock.dynamicUserGroup.findMany.mockRejectedValue(
      new Error("The table `public.DynamicUserGroup` does not exist in the current database."),
    );

    const html = renderToStaticMarkup(await AdminDynamicUserGroupsPage());

    expect(html).toContain("Динамические группы");
    expect(html).toContain("Динамические группы пока недоступны");
  });
});
