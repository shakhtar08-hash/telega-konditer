import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  performCreateTriggerRuleMock,
  performDeleteTriggerRuleMock,
  performRunTriggerNowMock,
  performSendTriggerTestMock,
  performUpdateTriggerRuleMock,
  isValidInternalServiceRequestMock,
  loadEnvMock,
} = vi.hoisted(() => ({
  performCreateTriggerRuleMock: vi.fn(),
  performDeleteTriggerRuleMock: vi.fn(),
  performRunTriggerNowMock: vi.fn(),
  performSendTriggerTestMock: vi.fn(),
  performUpdateTriggerRuleMock: vi.fn(),
  isValidInternalServiceRequestMock: vi.fn(() => true),
  loadEnvMock: vi.fn(() => ({
    INTERNAL_API_SHARED_SECRET: "shared-secret",
  })),
}));

vi.mock("@/features/admin/triggers/service", () => ({
  performCreateTriggerRule: performCreateTriggerRuleMock,
  performDeleteTriggerRule: performDeleteTriggerRuleMock,
  performRunTriggerNow: performRunTriggerNowMock,
  performSendTriggerTest: performSendTriggerTestMock,
  performUpdateTriggerRule: performUpdateTriggerRuleMock,
}));

vi.mock("@/lib/env", () => ({
  loadEnv: loadEnvMock,
}));

vi.mock("@/lib/internal-service-auth", () => ({
  isValidInternalServiceRequest: isValidInternalServiceRequestMock,
}));

import { POST } from "./route";

describe("POST /api/internal/admin/triggers/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadEnvMock.mockReturnValue({
      INTERNAL_API_SHARED_SECRET: "shared-secret",
    });
    isValidInternalServiceRequestMock.mockReturnValue(true);
    performRunTriggerNowMock.mockResolvedValue({
      message: "ok",
      ok: true,
    });
  });

  it("accepts json payloads for non-file trigger actions", async () => {
    const response = await POST(
      new Request("https://example.com/api/internal/admin/triggers/actions", {
        body: JSON.stringify({
          action: "runTriggerNow",
          id: "rule_1",
        }),
        headers: {
          "content-type": "application/json",
          "x-internal-shared-secret": "shared-secret",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(performRunTriggerNowMock).toHaveBeenCalledTimes(1);
    const [formData] = performRunTriggerNowMock.mock.calls[0] as [FormData];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("action")).toBe("runTriggerNow");
    expect(formData.get("id")).toBe("rule_1");
  });
});
