import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSession } from "@/lib/admin-auth";
import { POST } from "./route";

const {
  postInternalAdminTriggerAction,
  performCreateTriggerRule,
  performUpdateTriggerRule,
  revalidatePath,
} = vi.hoisted(() => ({
  postInternalAdminTriggerAction: vi.fn(),
  performCreateTriggerRule: vi.fn(),
  performUpdateTriggerRule: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/features/admin/triggers/internal-admin-client", () => ({
  postInternalAdminTriggerAction,
}));

vi.mock("@/features/admin/triggers/service", () => ({
  performCreateTriggerRule,
  performUpdateTriggerRule,
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

  return new Request("https://example.com/api/admin/triggers/save", {
    body: formData,
    headers: {
      cookie: `pastry_admin_session=${session}`,
    },
    method: "POST",
  });
}

describe("POST /api/admin/triggers/save", () => {
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

  it("creates a trigger for authorized admins", async () => {
    const formData = new FormData();
    formData.set("name", "Welcome");
    formData.set("eventKey", "user.started");
    formData.set("messageText", "Hello");

    const response = await POST(await createAuthorizedRequest(formData));

    expect(performCreateTriggerRule).toHaveBeenCalledWith(formData);
    expect(performUpdateTriggerRule).not.toHaveBeenCalled();
    expect(postInternalAdminTriggerAction).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/admin/triggers");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/admin/triggers");
  });

  it("updates an existing trigger when id is present", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");
    formData.set("name", "Updated");
    formData.set("eventKey", "promo.expired");
    formData.set("messageText", "Updated message");

    await POST(await createAuthorizedRequest(formData));

    expect(performUpdateTriggerRule).toHaveBeenCalledWith(formData);
    expect(performCreateTriggerRule).not.toHaveBeenCalled();
  });

  it("uses the internal bridge on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    const formData = new FormData();
    formData.set("id", "rule_1");
    formData.set("name", "Updated");
    formData.set("eventKey", "promo.expired");
    formData.set("messageText", "Updated message");

    await POST(await createAuthorizedRequest(formData));

    expect(postInternalAdminTriggerAction).toHaveBeenCalledWith(
      "updateTriggerRule",
      formData,
    );
    expect(performCreateTriggerRule).not.toHaveBeenCalled();
    expect(performUpdateTriggerRule).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated requests to login", async () => {
    const formData = new FormData();
    formData.set("name", "Welcome");

    const response = await POST(
      new Request("https://example.com/api/admin/triggers/save", {
        body: formData,
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/login");
    expect(performCreateTriggerRule).not.toHaveBeenCalled();
  });
});
