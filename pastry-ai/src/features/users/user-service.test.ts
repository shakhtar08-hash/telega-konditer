import { describe, expect, it } from "vitest";
import { createUserService } from "./user-service";

describe("UserService", () => {
  it("registers a Telegram user through the repository", async () => {
    const service = createUserService({
      userRepository: {
        upsertTelegramUser: async (input) => ({
          id: "user_1",
          telegramId: input.telegramId,
          username: input.username ?? null,
          name: input.name ?? null,
          plan: "FREE",
          credits: 10,
        }),
      },
    });

    const user = await service.registerTelegramUser({
      telegramId: "42",
      username: "chef",
      name: "Chef",
    });

    expect(user.telegramId).toBe("42");
  });
});
