import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock, dynamicGroupServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    tariffPlan: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
  dynamicGroupServiceMock: {
    listDynamicUserGroupOptions: vi.fn(),
    buildDynamicUserGroupPreview: vi.fn(),
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/features/dynamic-user-groups/query", () => ({
  buildDynamicUserGroupPreview: dynamicGroupServiceMock.buildDynamicUserGroupPreview,
}));

vi.mock("@/features/dynamic-user-groups/service", () => ({
  listDynamicUserGroupOptions: dynamicGroupServiceMock.listDynamicUserGroupOptions,
}));

import AdminUsersPage from "./page";

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a dynamic group filter", async () => {
    dynamicGroupServiceMock.listDynamicUserGroupOptions.mockResolvedValue([
      { value: "group_new", label: "Без активного тарифа" },
    ]);
    dynamicGroupServiceMock.buildDynamicUserGroupPreview.mockResolvedValue({
      total: 1,
      rows: [{ id: "user_1" }],
    });
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        telegramId: "1001",
        username: "chef",
        name: null,
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
        userTariff: null,
      },
    ]);
    prismaMock.tariffPlan.findMany.mockResolvedValue([]);

    const html = renderToStaticMarkup(
      await AdminUsersPage({
        searchParams: Promise.resolve({ dynamicGroupId: "group_new" }),
      }),
    );

    expect(html).toContain("Динамическая группа");
    expect(html).toContain("Без активного тарифа");
    expect(html).toContain("1001");
  });
  it("renders users when dynamic group options are temporarily unavailable", async () => {
    dynamicGroupServiceMock.listDynamicUserGroupOptions.mockResolvedValue([]);
    dynamicGroupServiceMock.buildDynamicUserGroupPreview.mockResolvedValue(null);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        telegramId: "1001",
        username: "chef",
        name: null,
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
        userTariff: null,
      },
    ]);
    prismaMock.tariffPlan.findMany.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminUsersPage());

    expect(html).toContain("Динамическая группа");
    expect(html).toContain("Все пользователи");
    expect(html).toContain("1001");
  });
  it("renders tariff expiry inputs in Moscow time", async () => {
    dynamicGroupServiceMock.listDynamicUserGroupOptions.mockResolvedValue([]);
    dynamicGroupServiceMock.buildDynamicUserGroupPreview.mockResolvedValue(null);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        telegramId: "1001",
        username: "roof09",
        name: null,
        createdAt: new Date("2026-07-22T01:17:16.074Z"),
        userTariff: {
          expiresAt: new Date("2026-07-25T01:17:18.277Z"),
          remainingTokens: 15,
          tariffPlan: {
            id: "plan_promo",
            name: "Промо",
            slug: "promo",
          },
        },
      },
    ]);
    prismaMock.tariffPlan.findMany.mockResolvedValue([
      { id: "plan_promo", name: "Промо", slug: "promo" },
    ]);

    const html = renderToStaticMarkup(await AdminUsersPage());

    expect(html).toContain('value="2026-07-25T04:17"');
    expect(html).not.toContain('value="2026-07-25T01:17"');
  });
});
