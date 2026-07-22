import { describe, expect, it } from "vitest";
import {
  getChromiumLaunchOptions,
  resolveChromiumExecutablePath,
} from "./playwright-launch";

describe("resolveChromiumExecutablePath", () => {
  it("prefers the explicit environment path when provided", () => {
    expect(
      resolveChromiumExecutablePath({
        env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: "/custom/chromium" },
        fileExists: () => false,
        platform: "linux",
      }),
    ).toBe("/custom/chromium");
  });

  it("falls back to common Linux Chromium locations", () => {
    expect(
      resolveChromiumExecutablePath({
        env: {},
        fileExists: (value) => value === "/usr/bin/chromium",
        platform: "linux",
      }),
    ).toBe("/usr/bin/chromium");
  });

  it("returns undefined when no browser path is available", () => {
    expect(
      resolveChromiumExecutablePath({
        env: {},
        fileExists: () => false,
        platform: "linux",
      }),
    ).toBeUndefined();
  });
});

describe("getChromiumLaunchOptions", () => {
  it("adds container-safe launch args on Linux", () => {
    expect(
      getChromiumLaunchOptions({
        env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: "/custom/chromium" },
        fileExists: () => false,
        platform: "linux",
      }),
    ).toMatchObject({
      args: expect.arrayContaining([
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ]),
      executablePath: "/custom/chromium",
    });
  });
});
