import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tariffPlan: {
      findMany: vi.fn(),
    },
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    userGroup: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/features/dynamic-user-groups/service", () => ({
  listMatchingDynamicUserGroupsForUser: vi.fn().mockResolvedValue([
    { id: "dynamic_1", name: "Без активного тарифа" },
  ]),
}));

import AdminUserDetailPage from "./page";

describe("AdminUserDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user groups and membership actions on the user detail page", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      telegramId: "12345",
      username: "cakeboss",
      name: "Cake Boss",
      promoClaimed: false,
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      userTariff: {
        expiresAt: new Date("2026-08-01T10:00:00.000Z"),
        remainingTokens: 24,
        tariffPlan: {
          id: "plan_1",
          name: "VIP тариф",
          slug: "vip",
        },
      },
      groupMemberships: [
        {
          createdAt: new Date("2026-07-13T11:00:00.000Z"),
          userGroupId: "group_1",
          userGroup: { id: "group_1", name: "VIP" },
        },
      ],
    });
    prismaMock.userGroup.findMany.mockResolvedValue([
      { id: "group_1", name: "VIP" },
      { id: "group_2", name: "Новички" },
    ]);
    prismaMock.tariffPlan.findMany.mockResolvedValue([
      { id: "plan_1", name: "VIP тариф", slug: "vip" },
      { id: "plan_2", name: "Базовый", slug: "basic" },
    ]);

    const html = renderToStaticMarkup(
      await AdminUserDetailPage({
        params: Promise.resolve({ userId: "user_1" }),
      }),
    );

    expect(html).toContain("cakeboss");
    expect(html).toContain("12345");
    expect(html).toContain("Группы пользователя");
    expect(html).toContain("VIP");
    expect(html).toContain("Удалить из группы");
    expect(html).toContain("Добавить группу");
    expect(html).toContain("Новички");
    expect(html).toContain("VIP тариф");
    expect(html).toContain("24");
    expect(html).toContain("Динамические группы");
    expect(html).toContain("Без активного тарифа");
  });
  it("renders the tariff expiry input in Moscow time", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "user_1",
      telegramId: "12345",
      username: "roof09",
      name: "Roof",
      promoClaimed: false,
      createdAt: new Date("2026-07-22T01:17:16.074Z"),
      userTariff: {
        expiresAt: new Date("2026-07-25T01:17:18.277Z"),
        remainingTokens: 15,
        tariffPlan: {
          id: "plan_1",
          name: "Промо",
          slug: "promo",
        },
      },
      groupMemberships: [],
    });
    prismaMock.userGroup.findMany.mockResolvedValue([]);
    prismaMock.tariffPlan.findMany.mockResolvedValue([
      { id: "plan_1", name: "Промо", slug: "promo" },
    ]);

    const html = renderToStaticMarkup(
      await AdminUserDetailPage({
        params: Promise.resolve({ userId: "user_1" }),
      }),
    );

    expect(html).toContain('value="2026-07-25T04:17"');
    expect(html).not.toContain('value="2026-07-25T01:17"');
  });
});
