import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchInternalAdminJsonMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/admin/shared/internal-admin-client", () => ({
  fetchInternalAdminJson: fetchInternalAdminJsonMock,
  shouldUseInternalAdminBridge: vi.fn(() => true),
}));

import { postInternalAdminTriggerAction } from "./internal-admin-client";

describe("trigger internal admin client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchInternalAdminJsonMock.mockResolvedValue({ ok: true });
  });

  it("sends now-trigger launch over json to the RU bridge", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    await postInternalAdminTriggerAction("runTriggerNow", formData);

    expect(fetchInternalAdminJsonMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchInternalAdminJsonMock.mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(path).toBe("/api/internal/admin/triggers/actions");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ action: "runTriggerNow", id: "rule_1" }));
  });
});
