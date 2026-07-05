import { describe, expect, it, vi } from "vitest";
import {
  botMenuButtons,
  seedBotMenuButtons,
} from "../../../prisma/seed-bot-menu-buttons.mjs";

describe("seed bot menu buttons", () => {
  it("creates seeded buttons only when the table is empty", async () => {
    const prismaMock = {
      botMenuButton: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
      },
    };

    await seedBotMenuButtons(prismaMock as never, [botMenuButtons[0]]);

    expect(prismaMock.botMenuButton.create).toHaveBeenCalledWith({
      data: {
        ...botMenuButtons[0],
      },
    });
  });

  it("does not recreate deleted buttons or overwrite edited ones after initialization", async () => {
    const prismaMock = {
      botMenuButton: {
        count: vi.fn().mockResolvedValue(2),
        create: vi.fn(),
      },
    };

    await seedBotMenuButtons(prismaMock as never, [botMenuButtons[0]]);

    expect(prismaMock.botMenuButton.create).not.toHaveBeenCalled();
  });
});
