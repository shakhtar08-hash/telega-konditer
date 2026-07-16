import { describe, expect, it } from "vitest";
import {
  INTERNAL_AUTH_HEADER,
  isValidInternalServiceRequest,
} from "./internal-service-auth";

describe("isValidInternalServiceRequest", () => {
  it("accepts matching internal shared secret", () => {
    const request = new Request("https://example.com", {
      headers: { [INTERNAL_AUTH_HEADER]: "shared-secret" },
    });

    expect(isValidInternalServiceRequest(request, "shared-secret")).toBe(true);
  });
});
