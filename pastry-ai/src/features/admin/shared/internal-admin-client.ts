import { INTERNAL_AUTH_HEADER } from "@/lib/internal-service-auth";

function getInternalAdminBaseUrl() {
  const baseUrl = process.env.INTERNAL_API_BASE_URL;
  const secret = process.env.INTERNAL_API_SHARED_SECRET;

  if (!baseUrl || !secret) {
    return null;
  }

  return { baseUrl, secret };
}

export function shouldUseInternalAdminBridge() {
  return process.env.APP_ROLE === "ingress" && getInternalAdminBaseUrl() !== null;
}

export async function fetchInternalAdminJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const config = getInternalAdminBaseUrl();

  if (!config) {
    throw new Error("Internal admin bridge is not configured");
  }

  const headers = new Headers(init?.headers);
  headers.set(INTERNAL_AUTH_HEADER, config.secret);
  if (!(init?.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(new URL(path, config.baseUrl), {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Internal admin bridge request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}
