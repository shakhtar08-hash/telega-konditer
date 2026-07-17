import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { POST } from "./route";

const {
  postInternalAdminTriggerAction,
  performDeleteTriggerRule,
  revalidatePath,
} = vi.hoisted(() => ({
  postInternalAdminTriggerAction: vi.fn(),
  performDeleteTriggerRule: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/features/admin/triggers/internal-admin-client", () => ({
  postInternalAdminTriggerAction,
}));

vi.mock("@/features/admin/triggers/service", () => ({
  performDeleteTriggerRule,
}));

const originalEnv = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  APP_BASE_URL: process.env.APP_BASE_URL,
  APP_ROLE: process.env.APP_ROLE,
};

async function createAuthorizedRequest(formData: FormData) {
  const session = await createAdminSession("admin", "session-secret");

  return new Request("https://example.com/api/admin/triggers/delete", {
    body: formData,
    headers: {
      cookie: `pastry_admin_session=${session}`,
    },
    method: "POST",
  });
}

describe("POST /api/admin/triggers/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "password";
    process.env.ADMIN_SESSION_SECRET = "session-secret";
    process.env.APP_BASE_URL = "https://example.com";
    delete process.env.APP_ROLE;
  });

  afterEach(() => {
    process.env.ADMIN_USERNAME = originalEnv.ADMIN_USERNAME;
    process.env.ADMIN_PASSWORD = originalEnv.ADMIN_PASSWORD;
    process.env.ADMIN_SESSION_SECRET = originalEnv.ADMIN_SESSION_SECRET;
    process.env.APP_BASE_URL = originalEnv.APP_BASE_URL;
    process.env.APP_ROLE = originalEnv.APP_ROLE;
  });

  it("deletes a trigger for authorized admins", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    const response = await POST(await createAuthorizedRequest(formData));

    expect(performDeleteTriggerRule).toHaveBeenCalledWith("rule_1");
    expect(postInternalAdminTriggerAction).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/triggers");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/admin/triggers");
  });

  it("uses the internal bridge on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    const formData = new FormData();
    formData.set("id", "rule_1");

    await POST(await createAuthorizedRequest(formData));

    expect(postInternalAdminTriggerAction).toHaveBeenCalledWith(
      "deleteTriggerRule",
      formData,
    );
    expect(performDeleteTriggerRule).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated requests to login", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    const response = await POST(
      new Request("https://example.com/api/admin/triggers/delete", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/login");
    expect(performDeleteTriggerRule).not.toHaveBeenCalled();
  });
});
