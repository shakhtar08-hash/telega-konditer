import { describe, expect, it } from "vitest";
import { photoStyles, seedPhotoStyles } from "../../../prisma/seed-photo-styles.mjs";
import { vi } from "vitest";

describe("seed photo styles", () => {
  it("pins all seeded styles to KIE with gpt-image-2", () => {
    const styles = photoStyles as Array<{ provider: string; model: string }>;

    expect(styles.length).toBeGreaterThan(0);

    for (const style of styles) {
      expect(style.provider).toBe("kie");
      expect(style.model).toBe("gpt-image-2");
    }
  });

  it("does not recreate legacy openai gpt-image-1 styles from defaults", () => {
    const styles = photoStyles as Array<{ provider: string; model: string }>;

    expect(
      styles.some(
        (style) => style.provider === "openai" || style.model === "gpt-image-1",
      ),
    ).toBe(false);
  });

  it("creates seeded styles only when the table is empty", async () => {
    const prismaMock = {
      botTextBlock: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
      },
      photoStyle: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
      },
    };

    await seedPhotoStyles(prismaMock as never, [photoStyles[0]]);

    expect(prismaMock.photoStyle.create).toHaveBeenCalledWith({
      data: photoStyles[0],
    });
    expect(prismaMock.botTextBlock.upsert).toHaveBeenCalled();
  });

  it("does not recreate deleted styles after the seed marker exists", async () => {
    const prismaMock = {
      botTextBlock: {
        findUnique: vi.fn().mockResolvedValue({ id: "seed-marker" }),
        upsert: vi.fn(),
      },
      photoStyle: {
        count: vi.fn(),
        create: vi.fn(),
      },
    };

    await seedPhotoStyles(prismaMock as never, [photoStyles[0]]);

    expect(prismaMock.photoStyle.count).not.toHaveBeenCalled();
    expect(prismaMock.photoStyle.create).not.toHaveBeenCalled();
    expect(prismaMock.botTextBlock.upsert).not.toHaveBeenCalled();
  });

  it("stores the seed marker even when styles already exist, so later deletions stay deleted", async () => {
    const prismaMock = {
      botTextBlock: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn(),
      },
      photoStyle: {
        count: vi.fn().mockResolvedValue(4),
        create: vi.fn(),
      },
    };

    await seedPhotoStyles(prismaMock as never, [photoStyles[0]]);

    expect(prismaMock.photoStyle.create).not.toHaveBeenCalled();
    expect(prismaMock.botTextBlock.upsert).toHaveBeenCalledWith({
      where: { key: "seed_state:photo_styles_initialized" },
      update: {},
      create: {
        key: "seed_state:photo_styles_initialized",
        text: "initialized",
      },
    });
  });
});
