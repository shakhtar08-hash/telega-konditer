import { existsSync } from "node:fs";
import path from "node:path";
import { InputFile } from "grammy";

const LOCAL_PUBLIC_PREFIXES = ["/onboarding/", "/uploads/"];

function resolveRuntimeUrl(rawValue: string): string {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return trimmedValue;
  }

  const baseUrl = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  try {
    return new URL(trimmedValue, `${baseUrl}/`).toString();
  } catch {
    return trimmedValue;
  }
}

function toLocalPublicAssetPath(rawValue: string): string | null {
  const runtimeUrl = resolveRuntimeUrl(rawValue);
  const pathname = (() => {
    try {
      return new URL(runtimeUrl).pathname;
    } catch {
      return rawValue.trim();
    }
  })();

  if (!LOCAL_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const absolutePath = path.join(
    process.cwd(),
    "public",
    ...pathname.replace(/^\/+/, "").split("/"),
  );

  return existsSync(absolutePath) ? absolutePath : null;
}

export function resolveTelegramPhotoInput(rawValue: string): string | InputFile {
  const localAssetPath = toLocalPublicAssetPath(rawValue);

  if (localAssetPath) {
    return new InputFile(localAssetPath);
  }

  return resolveRuntimeUrl(rawValue);
}
