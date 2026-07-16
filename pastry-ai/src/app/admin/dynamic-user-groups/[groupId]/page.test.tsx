import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    dynamicUserGroup: {
      findUnique: vi.fn(),
    },
    triggerRule: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

import AdminDynamicUserGroupPage from "./page";

describe("AdminDynamicUserGroupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders preview users and trigger usage", async () => {
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
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        telegramId: "1001",
        username: "chef",
        name: null,
        promoClaimed: false,
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        userTariff: null,
        generatedRecipeContexts: [],
        usage: [],
        conversations: [],
      },
    ]);
    prismaMock.triggerRule.findMany.mockResolvedValue([
      {
        id: "rule_1",
        name: "Возврат без тарифа",
        conditions: [{ field: "dynamicUserGroupId", operator: "matches", value: "group_new" }],
      },
    ]);

    const html = renderToStaticMarkup(
      await AdminDynamicUserGroupPage({
        params: Promise.resolve({ groupId: "group_new" }),
      }),
    );

    expect(html).toContain("Без активного тарифа");
    expect(html).toContain("Превью сегмента");
    expect(html).toContain("Возврат без тарифа");
    expect(html).toContain("chef");
  });
});
