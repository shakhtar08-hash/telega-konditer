import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type { PhotoStyleMutationInput } from "./service";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

type PhotoStyleAction = "createPhotoStyle" | "updatePhotoStyle" | "deletePhotoStyle";

export async function fetchInternalAdminPhotoStylesPageData() {
  const data = await fetchInternalAdminJson<{
    styles: Array<{
      active: boolean;
      createdAt: string;
      description: string;
      id: string;
      model: string | null;
      name: string;
      preview: string | null;
      prompt: string;
      provider: string | null;
      userPreview: string | null;
      userText: string | null;
    }>;
  }>("/api/internal/admin/photo-styles");

  return {
    styles: data.styles.map((style) => ({
      ...style,
      createdAt: new Date(style.createdAt),
    })),
  };
}

export async function postInternalAdminPhotoStyleAction(
  action: PhotoStyleAction,
  payload:
    | PhotoStyleMutationInput
    | (PhotoStyleMutationInput & { id: string })
    | { id: string }
    | FormData,
) {
  if (payload instanceof FormData) {
    const requestBody = new FormData();
    for (const [key, value] of payload.entries()) {
      requestBody.append(key, value);
    }
    requestBody.set("action", action);

    await fetchInternalAdminJson("/api/internal/admin/photo-styles/actions", {
      body: requestBody,
      method: "POST",
    });
    return;
  }

  await fetchInternalAdminJson("/api/internal/admin/photo-styles/actions", {
    body: JSON.stringify({ action, payload }),
    method: "POST",
  });
}
