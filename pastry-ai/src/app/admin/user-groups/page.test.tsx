import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    userGroup: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

import AdminUserGroupsPage from "./page";

describe("AdminUserGroupsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders groups with create, open, and delete affordances", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([
      {
        id: "group_1",
        name: "VIP",
        description: "Главные клиенты",
        updatedAt: new Date("2026-07-13T09:00:00.000Z"),
        _count: { memberships: 2 },
      },
    ]);

    const html = renderToStaticMarkup(await AdminUserGroupsPage());

    expect(html).toContain("Группы пользователей");
    expect(html).toContain("Ручные группы для сегментации и триггеров.");
    expect(html).toContain("Создать группу");
    expect(html).toContain("Название группы");
    expect(html).toContain("Описание");
    expect(html).toContain("VIP");
    expect(html).toContain("Главные клиенты");
    expect(html).toContain("2");
    expect(html).toContain("/admin/user-groups/group_1");
    expect(html).toContain("Открыть");
    expect(html).toContain("Удалить");
  });

  it("renders an empty state when there are no groups yet", async () => {
    prismaMock.userGroup.findMany.mockResolvedValue([]);

    const html = renderToStaticMarkup(await AdminUserGroupsPage());

    expect(html).toContain("Групп пока нет");
    expect(html).toContain("Создайте первую ручную группу");
  });

  it("renders a fallback state when the user groups table is missing", async () => {
    prismaMock.userGroup.findMany.mockRejectedValue(
      new Error("The table `public.UserGroup` does not exist in the current database."),
    );

    const html = renderToStaticMarkup(await AdminUserGroupsPage());

    expect(html).toContain("Группы пользователей");
    expect(html).toContain("Группы пользователей пока недоступны");
    expect(html).toContain("Таблица групп ещё не создана в базе");
    expect(html).not.toContain("Создать группу");
  });
});
