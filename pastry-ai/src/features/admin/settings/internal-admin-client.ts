import {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";
import type { loadAdminSettingsPageData } from "./service";

export {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";

type AdminSettingsPageData = Awaited<
  ReturnType<typeof loadAdminSettingsPageData>
>;

export async function fetchInternalAdminSettingsPageData(): Promise<AdminSettingsPageData> {
  const data = await fetchInternalAdminJson<{
    dbStatus: "ok" | "error";
    storedSecrets: Array<{
      key: string;
      updatedAt: string;
      valuePreview: string;
    }>;
  }>("/api/internal/admin/settings");

  return {
    dbStatus: data.dbStatus,
    storedSecrets: data.storedSecrets.map((secret) => ({
      ...secret,
      updatedAt: new Date(secret.updatedAt),
    })),
  };
}

export async function postInternalAdminSettingsAction(
  action: "clearApiSecret" | "saveApiSecret",
  payload: {
    key: string;
    value?: string;
  },
) {
  await fetchInternalAdminJson("/api/internal/admin/settings/actions", {
    body: JSON.stringify({ action, payload }),
    method: "POST",
  });
}
