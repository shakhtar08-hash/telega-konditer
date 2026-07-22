import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  performCreateTriggerRuleMock,
  performDeleteTriggerRuleMock,
  performRunTriggerNowMock,
  performSendTriggerTestMock,
  performUpdateTriggerRuleMock,
  postInternalAdminTriggerActionMock,
  redirectMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  performCreateTriggerRuleMock: vi.fn(),
  performDeleteTriggerRuleMock: vi.fn(),
  performRunTriggerNowMock: vi.fn(),
  performSendTriggerTestMock: vi.fn(),
  performUpdateTriggerRuleMock: vi.fn(),
  postInternalAdminTriggerActionMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/admin/triggers/service", () => ({
  performCreateTriggerRule: performCreateTriggerRuleMock,
  performDeleteTriggerRule: performDeleteTriggerRuleMock,
  performRunTriggerNow: performRunTriggerNowMock,
  performSendTriggerTest: performSendTriggerTestMock,
  performUpdateTriggerRule: performUpdateTriggerRuleMock,
}));

vi.mock("@/features/admin/triggers/internal-admin-client", () => ({
  postInternalAdminTriggerAction: postInternalAdminTriggerActionMock,
}));

import {
  createTriggerRule,
  deleteTriggerRule,
  runTriggerNow,
  sendTriggerTestMessage,
  updateTriggerRule,
} from "./actions";

describe("trigger rule actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
    performCreateTriggerRuleMock.mockResolvedValue(undefined);
    performDeleteTriggerRuleMock.mockResolvedValue(undefined);
    performRunTriggerNowMock.mockResolvedValue({
      message: "Разослано по текущей аудитории: 3",
      ok: true,
    });
    performUpdateTriggerRuleMock.mockResolvedValue(undefined);
    performSendTriggerTestMock.mockResolvedValue({
      message: "ok",
      ok: true,
    });
    postInternalAdminTriggerActionMock.mockResolvedValue({
      message: "bridge-ok",
      ok: true,
    });
  });

  it("creates a trigger locally and redirects back to the list", async () => {
    const formData = new FormData();
    formData.set("name", "After Start");

    await expect(createTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(performCreateTriggerRuleMock).toHaveBeenCalledWith(formData);
    expect(postInternalAdminTriggerActionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/triggers");
  });

  it("routes trigger creation through RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const formData = new FormData();
    formData.set("name", "After Start");

    await expect(createTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(postInternalAdminTriggerActionMock).toHaveBeenCalledWith(
      "createTriggerRule",
      formData,
    );
    expect(performCreateTriggerRuleMock).not.toHaveBeenCalled();
  });

  it("updates a trigger locally and redirects back to the list", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    await expect(updateTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(performUpdateTriggerRuleMock).toHaveBeenCalledWith(formData);
    expect(postInternalAdminTriggerActionMock).not.toHaveBeenCalled();
  });

  it("routes trigger updates through RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const formData = new FormData();
    formData.set("id", "rule_1");

    await expect(updateTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(postInternalAdminTriggerActionMock).toHaveBeenCalledWith(
      "updateTriggerRule",
      formData,
    );
    expect(performUpdateTriggerRuleMock).not.toHaveBeenCalled();
  });

  it("deletes a trigger locally by id", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    await expect(deleteTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(performDeleteTriggerRuleMock).toHaveBeenCalledWith("rule_1");
    expect(postInternalAdminTriggerActionMock).not.toHaveBeenCalled();
  });

  it("routes trigger deletion through RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const formData = new FormData();
    formData.set("id", "rule_1");

    await expect(deleteTriggerRule(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(postInternalAdminTriggerActionMock).toHaveBeenCalledWith(
      "deleteTriggerRule",
      formData,
    );
    expect(performDeleteTriggerRuleMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when test-send form data is missing", async () => {
    await expect(sendTriggerTestMessage({ message: "", ok: false })).resolves.toEqual({
      message: "Не удалось прочитать данные формы для тестовой отправки.",
      ok: false,
    });
  });

  it("sends the current draft locally when not on ingress", async () => {
    const formData = new FormData();
    formData.set("messageText", "<b>Hello</b>");
    performSendTriggerTestMock.mockResolvedValue({
      message: "Тестовое сообщение отправлено: 2",
      ok: true,
    });

    await expect(sendTriggerTestMessage(formData)).resolves.toEqual({
      message: "Тестовое сообщение отправлено: 2",
      ok: true,
    });

    expect(performSendTriggerTestMock).toHaveBeenCalledWith(formData);
    expect(postInternalAdminTriggerActionMock).not.toHaveBeenCalled();
  });

  it("routes trigger test-send through RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const formData = new FormData();
    formData.set("messageText", "<b>Hi</b>");

    await sendTriggerTestMessage(formData);

    expect(postInternalAdminTriggerActionMock).toHaveBeenCalledWith(
      "sendTriggerTest",
      formData,
    );
    expect(performSendTriggerTestMock).not.toHaveBeenCalled();
  });

  it("runs a now-trigger locally when not on ingress", async () => {
    const formData = new FormData();
    formData.set("id", "rule_1");

    await expect(runTriggerNow(formData)).resolves.toEqual({
      message: "Разослано по текущей аудитории: 3",
      ok: true,
    });

    expect(performRunTriggerNowMock).toHaveBeenCalledWith(formData);
    expect(postInternalAdminTriggerActionMock).not.toHaveBeenCalled();
  });

  it("routes manual now-trigger launch through RU on ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";

    const formData = new FormData();
    formData.set("id", "rule_1");

    await runTriggerNow(formData);

    expect(postInternalAdminTriggerActionMock).toHaveBeenCalledWith(
      "runTriggerNow",
      formData,
    );
    expect(performRunTriggerNowMock).not.toHaveBeenCalled();
  });
});
