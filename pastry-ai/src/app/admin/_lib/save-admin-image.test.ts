import { describe, expect, it } from "vitest";
import { saveAdminImage } from "./save-admin-image";

function makeImageFile(name = "cake.png", size = 8) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

describe("saveAdminImage", () => {
  it("returns manual value when file is missing", async () => {
    const result = await saveAdminImage({
      entity: "triggers",
      file: null,
      manualValue: "/uploads/admin/triggers/manual.png",
    });

    expect(result).toBe("/uploads/admin/triggers/manual.png");
  });

  it("returns saved upload path when file is present", async () => {
    const result = await saveAdminImage({
      entity: "triggers",
      file: makeImageFile(),
      manualValue: "/uploads/admin/triggers/manual.png",
    });

    expect(result).toMatch(/^\/uploads\/admin\/triggers\/.+\.png$/);
  });

  it("returns manual value when file type is not an image", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    const result = await saveAdminImage({
      entity: "funnel",
      file,
      manualValue: "/onboarding/existing.png",
    });

    expect(result).toBe("/onboarding/existing.png");
  });

  it("returns manual value when file is empty", async () => {
    const file = new File([], "empty.png", { type: "image/png" });

    const result = await saveAdminImage({
      entity: "chat-bot",
      file,
      manualValue: "/uploads/admin/chat-bot/manual.png",
    });

    expect(result).toBe("/uploads/admin/chat-bot/manual.png");
  });

  it("returns existing value when file is rejected and no manual value", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    const result = await saveAdminImage({
      entity: "triggers",
      file,
      existingValue: "/old/path.png",
    });

    expect(result).toBe("/old/path.png");
  });

  it("returns null when file is missing and no values given", async () => {
    const result = await saveAdminImage({
      entity: "photo-styles",
      file: null,
    });

    expect(result).toBeNull();
  });
});