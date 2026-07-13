import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findMany: vi.fn(),
    },
    userGroup: {
      findUniqueOrThrow: vi.fn(),
    },
    userGroupMember: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

import AdminUserGroupPage from "./page";

describe("AdminUserGroupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the group header, members, and searchable add form", async () => {
    prismaMock.userGroup.findUniqueOrThrow.mockResolvedValue({
      id: "group_1",
      name: "VIP",
      description: "Главные клиенты",
      updatedAt: new Date("2026-07-13T09:00:00.000Z"),
    });
    prismaMock.userGroupMember.findMany.mockResolvedValue([
      {
        createdAt: new Date("2026-07-13T10:00:00.000Z"),
        userId: "user_1",
        userGroupId: "group_1",
        user: {
          id: "user_1",
          telegramId: "12345",
          username: "cakeboss",
          name: "Cake Boss",
        },
      },
    ]);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_2",
        telegramId: "67890",
        username: "new_user",
        name: "New User",
      },
    ]);

    const html = renderToStaticMarkup(
      await AdminUserGroupPage({
        params: Promise.resolve({ groupId: "group_1" }),
        searchParams: Promise.resolve({ search: "new" }),
      }),
    );

    expect(html).toContain("VIP");
    expect(html).toContain("Главные клиенты");
    expect(html).toContain("Участники группы");
    expect(html).toContain("cakeboss");
    expect(html).toContain("12345");
    expect(html).toContain("Удалить из группы");
    expect(html).toContain("Добавить пользователя");
    expect(html).toContain("Поиск по Telegram ID, username или имени");
    expect(html).toContain("new");
    expect(html).toContain("new_user");
    expect(html).toContain("Добавить в группу");
  });
});
