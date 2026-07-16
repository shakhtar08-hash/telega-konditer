import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    dynamicUserGroup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/db/prisma", () => ({
  prisma: prismaMock,
}));

const {
  countDynamicUserGroupMatches,
  listDynamicUserGroupOptions,
  listDynamicUserGroupPreviewUsers,
} = await import("./service");

describe("dynamic-user-group service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a live count for an active group", async () => {
    prismaMock.dynamicUserGroup.findUnique.mockResolvedValue({
      id: "group_live",
      name: "Live",
      status: "active",
      logicOperator: "AND",
      conditionsJson: [{ field: "hasActiveTariff", operator: "is", value: false }],
    });
    prismaMock.user.findMany.mockResolvedValue([
      buildUserRow({
        id: "user_1",
        telegramId: "1001",
        hasTariff: false,
      }),
      buildUserRow({
        id: "user_2",
        telegramId: "1002",
        hasTariff: false,
      }),
      buildUserRow({
        id: "user_3",
        telegramId: "1003",
        hasTariff: true,
      }),
    ]);

    await expect(countDynamicUserGroupMatches("group_live")).resolves.toBe(2);
  });

  it("returns paginated preview rows", async () => {
    prismaMock.dynamicUserGroup.findUnique.mockResolvedValue({
      id: "group_live",
      name: "Live",
      status: "active",
      logicOperator: "AND",
      conditionsJson: [{ field: "promoClaimed", operator: "is", value: true }],
    });
    prismaMock.user.findMany.mockResolvedValue([
      buildUserRow({
        id: "user_1",
        telegramId: "1001",
        promoClaimed: true,
      }),
      buildUserRow({
        id: "user_2",
        telegramId: "1002",
        promoClaimed: false,
      }),
    ]);

    await expect(listDynamicUserGroupPreviewUsers("group_live", 1)).resolves.toMatchObject({
      total: 1,
      rows: [{ id: "user_1", telegramId: "1001" }],
    });
  });

  it("returns an empty option list when dynamic groups are temporarily unavailable", async () => {
    prismaMock.dynamicUserGroup.findMany.mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'findMany')"),
    );

    await expect(listDynamicUserGroupOptions()).resolves.toEqual([]);
  });
});

function buildUserRow({
  id,
  telegramId,
  promoClaimed = false,
  hasTariff = false,
}: {
  id: string;
  telegramId: string;
  promoClaimed?: boolean;
  hasTariff?: boolean;
}) {
  const now = new Date("2026-07-14T10:00:00.000Z");

  return {
    id,
    telegramId,
    username: null,
    name: null,
    plan: "FREE",
    promoClaimed,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    userTariff: hasTariff
      ? {
          remainingTokens: 10,
          expiresAt: new Date("2026-08-01T10:00:00.000Z"),
        }
      : null,
    generatedRecipeContexts: [{ createdAt: now }],
    usage: [],
    conversations: [],
  };
}
