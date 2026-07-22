import { InputFile } from "grammy";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTelegramPhotoInput } from "./telegram-media";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

const existsSyncMock = vi.mocked(existsSync);

describe("resolveTelegramPhotoInput", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_BASE_URL;
  });

  it("uses a local InputFile for relative uploaded assets", () => {
    existsSyncMock.mockReturnValue(true);

    const result = resolveTelegramPhotoInput("/uploads/admin/funnel/offer.jpg");

    expect(result).toBeInstanceOf(InputFile);
  });

  it("uses a local InputFile for public URLs that point to local assets", () => {
    process.env.APP_BASE_URL = "https://eu-gateway.example.com";
    existsSyncMock.mockReturnValue(true);

    const result = resolveTelegramPhotoInput(
      "https://eu-gateway.example.com/uploads/admin/funnel/offer.jpg",
    );

    expect(result).toBeInstanceOf(InputFile);
  });

  it("keeps external remote images as URLs", () => {
    const result = resolveTelegramPhotoInput("https://cdn.example.com/offer.jpg");

    expect(result).toBe("https://cdn.example.com/offer.jpg");
  });
});
