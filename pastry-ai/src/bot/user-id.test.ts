import { describe, expect, it, vi } from "vitest";
import { resolveUserIdByTelegramId } from "./user-id";

describe("resolveUserIdByTelegramId", () => {
  it("returns the internal user id for a known Telegram user", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "user_1" });

    await expect(
      resolveUserIdByTelegramId({ findUnique }, "185511358"),
    ).resolves.toBe("user_1");

    expect(findUnique).toHaveBeenCalledWith({
      select: { id: true },
      where: { telegramId: "185511358" },
    });
  });

  it("returns null when Telegram user id is missing", async () => {
    const findUnique = vi.fn();

    await expect(resolveUserIdByTelegramId({ findUnique }, "")).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when no user exists for the Telegram id", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);

    await expect(
      resolveUserIdByTelegramId({ findUnique }, "999"),
    ).resolves.toBeNull();
  });
});
