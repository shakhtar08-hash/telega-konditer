import {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";
import type { FunnelAdminStep, FunnelMutationInput } from "./service";

export {
  fetchInternalAdminJson,
  shouldUseInternalAdminBridge,
} from "@/features/admin/shared/internal-admin-client";

type FunnelActionPayload = FunnelMutationInput & {
  id?: string;
};

export async function fetchInternalAdminFunnelPageData() {
  return fetchInternalAdminJson<{ steps: FunnelAdminStep[] }>("/api/internal/admin/funnel");
}

export async function postInternalAdminFunnelAction(
  action: "createFunnelStep" | "updateFunnelStep",
  payload: FunnelActionPayload,
) {
  await fetchInternalAdminJson("/api/internal/admin/funnel/actions", {
    body: JSON.stringify({ action, payload }),
    method: "POST",
  });
}
