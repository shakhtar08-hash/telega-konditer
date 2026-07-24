import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type { FunnelAdminStep, FunnelMutationInput } from "./service";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

type FunnelActionPayload = FunnelMutationInput & {
  id?: string;
};

export async function fetchInternalAdminFunnelPageData() {
  return fetchInternalAdminJson<{ steps: FunnelAdminStep[] }>("/api/internal/admin/funnel");
}

export async function postInternalAdminFunnelAction(
  action: "createFunnelStep" | "updateFunnelStep",
  payload: FunnelActionPayload | FormData,
) {
  if (payload instanceof FormData) {
    const requestBody = new FormData();
    for (const [key, value] of payload.entries()) {
      requestBody.append(key, value);
    }
    requestBody.set("action", action);

    await fetchInternalAdminJson("/api/internal/admin/funnel/actions", {
      body: requestBody,
      method: "POST",
    });
    return;
  }

  await fetchInternalAdminJson("/api/internal/admin/funnel/actions", {
    body: JSON.stringify({ action, payload }),
    method: "POST",
  });
}
