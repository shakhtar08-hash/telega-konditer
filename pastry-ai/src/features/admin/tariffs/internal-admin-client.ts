import {
  fetchInternalAdminJson,
} from "@/features/admin/shared/internal-admin-client";
import type { loadAdminTariffsPageData } from "./service";

export { shouldUseInternalAdminBridge } from "@/features/admin/shared/internal-admin-client";

type AdminTariffsPageData = Awaited<ReturnType<typeof loadAdminTariffsPageData>>;

function cloneFormData(input: FormData) {
  const formData = new FormData();

  for (const [key, value] of input.entries()) {
    formData.append(key, value);
  }

  return formData;
}

export async function fetchInternalAdminTariffsPageData(): Promise<AdminTariffsPageData> {
  const data = await fetchInternalAdminJson<{
    tariffs: Array<
      AdminTariffsPageData["tariffs"][number] & {
        createdAt: string;
        updatedAt: string;
      }
    >;
  }>("/api/internal/admin/tariffs");

  return {
    tariffs: data.tariffs.map((tariff) => ({
      ...tariff,
      createdAt: new Date(tariff.createdAt),
      updatedAt: new Date(tariff.updatedAt),
    })),
  };
}

export async function postInternalAdminTariffAction(
  action: "createTariff" | "toggleTariff" | "updateTariff",
  payload: FormData,
) {
  const formData = cloneFormData(payload);
  formData.set("action", action);

  await fetchInternalAdminJson("/api/internal/admin/tariffs/actions", {
    body: formData,
    method: "POST",
  });
}
