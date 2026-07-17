import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteBotMenuButtonMock,
  deleteDynamicUserGroupMock,
  deletePhotoStyleMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  deleteBotMenuButtonMock: vi.fn(),
  deleteDynamicUserGroupMock: vi.fn(),
  deletePhotoStyleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/app/admin/_lib/save-admin-image", () => ({
  saveAdminImage: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    botMenuButton: {
      delete: deleteBotMenuButtonMock,
    },
    dynamicUserGroup: {
      delete: deleteDynamicUserGroupMock,
      findMany: vi.fn(),
    },
    photoStyle: {
      delete: deletePhotoStyleMock,
      findMany: vi.fn(),
    },
    prompt: {
      findMany: vi.fn(),
    },
    botTextBlock: {
      findUnique: vi.fn(),
    },
  },
}));

import { deleteBotMenuButton } from "./chat-bot/page";
import { deleteDynamicUserGroup } from "./dynamic-user-groups/actions";
import { deleteStyle } from "./photo-styles/page";

describe("admin delete actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.APP_ROLE;
    delete process.env.INTERNAL_API_BASE_URL;
    delete process.env.INTERNAL_API_SHARED_SECRET;
    deleteBotMenuButtonMock.mockResolvedValue(undefined);
    deleteDynamicUserGroupMock.mockResolvedValue(undefined);
    deletePhotoStyleMock.mockResolvedValue(undefined);
  });

  it("deletes a bot menu button and refreshes the chat-bot page", async () => {
    const formData = new FormData();
    formData.set("id", "button_1");

    await deleteBotMenuButton(formData);

    expect(deleteBotMenuButtonMock).toHaveBeenCalledWith({
      where: { id: "button_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/chat-bot");
  });

  it("deletes a dynamic user group and refreshes related admin views", async () => {
    const formData = new FormData();
    formData.set("id", "group_1");

    await deleteDynamicUserGroup(formData);

    expect(deleteDynamicUserGroupMock).toHaveBeenCalledWith({
      where: { id: "group_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/dynamic-user-groups");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/triggers");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/dynamic-user-groups/group_1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users?dynamicGroupId=group_1");
  });

  it("deletes a photo style and refreshes the photo-styles page", async () => {
    const formData = new FormData();
    formData.set("id", "style_1");

    await deleteStyle(formData);

    expect(deletePhotoStyleMock).toHaveBeenCalledWith({
      where: { id: "style_1" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/photo-styles");
  });

  it("posts bot menu button deletes to RU when running as ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("id", "button_1");

    await deleteBotMenuButton(formData);

    expect(fetchMock).toHaveBeenCalled();
    expect(deleteBotMenuButtonMock).not.toHaveBeenCalled();
  });

  it("posts photo style deletes to RU when running as ingress", async () => {
    process.env.APP_ROLE = "ingress";
    process.env.INTERNAL_API_BASE_URL = "http://10.10.0.1:3000";
    process.env.INTERNAL_API_SHARED_SECRET = "shared-secret";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.set("id", "style_1");

    await deleteStyle(formData);

    expect(fetchMock).toHaveBeenCalled();
    expect(deletePhotoStyleMock).not.toHaveBeenCalled();
  });
});
