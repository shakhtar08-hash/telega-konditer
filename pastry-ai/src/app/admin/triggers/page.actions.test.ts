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
  it("fails loudly for createTriggerMessage", async () => {
    const formData = new FormData();
    formData.set("slug", "after-start");
    formData.set("title", "Legacy");

    await expect(createTriggerMessage(formData)).rejects.toThrow(
      "Legacy trigger actions moved out of the Task 4 list page. Task 5 replaces this compatibility surface with TriggerRule actions.",
    );
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("fails loudly for updateTriggerMessage", async () => {
    const formData = new FormData();
    formData.set("id", "legacy_1");
    formData.set("title", "Legacy");

    await expect(updateTriggerMessage(formData)).rejects.toThrow(
      "Legacy trigger actions moved out of the Task 4 list page. Task 5 replaces this compatibility surface with TriggerRule actions.",
    );
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("fails loudly for deleteTriggerMessage", async () => {
    const formData = new FormData();
    formData.set("id", "legacy_1");

    await expect(deleteTriggerMessage(formData)).rejects.toThrow(
      "Legacy trigger actions moved out of the Task 4 list page. Task 5 replaces this compatibility surface with TriggerRule actions.",
    );
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
