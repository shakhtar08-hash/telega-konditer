import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "./internal-admin-client";

describe("admin shared internal bridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
  });

  it("reports bridge enabled only for ingress with config", () => {
    expect(shouldUseInternalAdminBridge()).toBe(true);
    delete process.env.INTERNAL_API_BASE_URL;
    expect(shouldUseInternalAdminBridge()).toBe(false);
  });

  it("sends authenticated json requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchInternalAdminJson("/api/internal/admin/funnel");

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;

    expect(url).toEqual(
      new URL("/api/internal/admin/funnel", "http://10.10.0.1:3000"),
    );
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-internal-shared-secret")).toBe("shared-secret");
  });

  it("preserves caller headers when given a Headers instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchInternalAdminJson("/api/internal/admin/funnel", {
      headers: new Headers({
        accept: "application/json",
        "x-caller-header": "caller-value",
      }),
    });

    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;

    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("x-caller-header")).toBe("caller-value");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-internal-shared-secret")).toBe("shared-secret");
  });
});
