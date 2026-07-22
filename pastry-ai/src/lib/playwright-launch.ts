import { existsSync } from "node:fs";
import type { LaunchOptions } from "playwright";

const linuxChromiumCandidates = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
] as const;

type ResolveOptions = {
  env?: Record<string, string | undefined>;
  fileExists?: (path: string) => boolean;
  platform?: NodeJS.Platform;
};

export function resolveChromiumExecutablePath(
  options: ResolveOptions = {},
): string | undefined {
  const env = options.env ?? process.env;
  const fileExists = options.fileExists ?? existsSync;
  const platform = options.platform ?? process.platform;
  const explicitPath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();

  if (explicitPath) {
    return explicitPath;
  }

  if (platform !== "linux") {
    return undefined;
  }

  return linuxChromiumCandidates.find((candidate) => fileExists(candidate));
}

export function getChromiumLaunchOptions(
  options: ResolveOptions = {},
): LaunchOptions {
  const executablePath = resolveChromiumExecutablePath(options);
  const platform = options.platform ?? process.platform;

  return {
    args:
      platform === "linux"
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ]
        : [],
    executablePath,
  };
}
