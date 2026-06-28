import { describe, expect, it } from "vitest";
import {
  createAdminSession,
  getAdminAuthConfig,
  isAdminSessionValid,
  isValidAdminCredentials,
} from "./admin-auth";

const authEnv = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "password",
  ADMIN_SESSION_SECRET: "session-secret",
};

describe("admin auth", () => {
  it("validates configured admin credentials", () => {
    expect(
      isValidAdminCredentials(
        { username: "admin", password: "password" },
        authEnv,
      ),
    ).toBe(true);
    expect(
      isValidAdminCredentials(
        { username: "admin", password: "wrong" },
        authEnv,
      ),
    ).toBe(false);
  });

  it("signs and verifies admin session cookies", async () => {
    const session = await createAdminSession("admin", "session-secret", {
      now: new Date("2026-06-28T12:00:00.000Z"),
      ttlSeconds: 60,
    });

    await expect(
      isAdminSessionValid(session, "session-secret", {
        now: new Date("2026-06-28T12:00:30.000Z"),
      }),
    ).resolves.toBe(true);
    await expect(
      isAdminSessionValid(session, "session-secret", {
        now: new Date("2026-06-28T12:02:00.000Z"),
      }),
    ).resolves.toBe(false);
  });

  it("loads admin auth config only when all values are present", () => {
    expect(getAdminAuthConfig(authEnv)).toEqual(authEnv);
    expect(getAdminAuthConfig({ ADMIN_USERNAME: "admin" })).toBeNull();
  });
});
