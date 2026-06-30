import { describe, expect, it, vi } from "vitest";
import {
  decryptApiSecretValue,
  encryptApiSecretValue,
  maskSecretValue,
  resolveManagedApiKey,
} from "./api-secrets";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    apiSecret: {
      findUnique,
    },
  },
}));

describe("api secrets", () => {
  it("masks secret values without exposing the full key", () => {
    expect(maskSecretValue("sk-or-v1-1234567890abcdef")).toBe(
      "sk-o...cdef",
    );
  });

  it("encrypts and decrypts API secret values", () => {
    const encrypted = encryptApiSecretValue("fal-secret-key", "server-secret");

    expect(encrypted).not.toContain("fal-secret-key");
    expect(decryptApiSecretValue(encrypted, "server-secret")).toBe(
      "fal-secret-key",
    );
  });

  it("resolves API keys from environment before the database", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "env-key");

    await expect(resolveManagedApiKey("OPENROUTER_API_KEY")).resolves.toBe(
      "env-key",
    );
    expect(findUnique).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("resolves API keys from encrypted database values", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "server-secret");
    findUnique.mockResolvedValue({
      encryptedValue: encryptApiSecretValue("stored-key", "server-secret"),
    });

    await expect(resolveManagedApiKey("FAL_KEY")).resolves.toBe("stored-key");

    vi.unstubAllEnvs();
  });
});
