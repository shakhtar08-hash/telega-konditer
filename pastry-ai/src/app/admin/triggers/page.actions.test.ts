import { describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
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

import {
  createTriggerMessage,
  deleteTriggerMessage,
  updateTriggerMessage,
} from "./page.legacy-actions";

describe("legacy trigger action compatibility", () => {
  it("keeps createTriggerMessage importable and inert", async () => {
    const formData = new FormData();
    formData.set("slug", "after-start");
    formData.set("title", "Legacy");

    await expect(createTriggerMessage(formData)).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("keeps updateTriggerMessage importable and inert", async () => {
    const formData = new FormData();
    formData.set("id", "legacy_1");
    formData.set("title", "Legacy");

    await expect(updateTriggerMessage(formData)).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("keeps deleteTriggerMessage importable and inert", async () => {
    const formData = new FormData();
    formData.set("id", "legacy_1");

    await expect(deleteTriggerMessage(formData)).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
