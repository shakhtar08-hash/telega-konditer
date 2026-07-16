import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health/gateway", () => {
  it("returns a non-sensitive gateway readiness payload", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(JSON.stringify(body)).not.toContain("SECRET");
  });
});
