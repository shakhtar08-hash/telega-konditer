import { AdminPageHeader, DataTable } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSectionTitle,
} from "@/components/admin/form";
import {
  fetchInternalAdminSettingsPageData,
  postInternalAdminSettingsAction,
} from "@/features/admin/settings/internal-admin-client";
import {
  loadAdminSettingsPageData,
  performClearApiSecret,
  performSaveApiSecret,
} from "@/features/admin/settings/service";
import { managedApiKeys, maskSecretValue } from "@/lib/api-secrets";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const envKeys = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "CRON_SECRET",
  "INTERNAL_API_BASE_URL",
  "INTERNAL_API_SHARED_SECRET",
  "INTERNAL_TELEGRAM_INGRESS_URL",
  "INTERNAL_AI_GATEWAY_URL",
  "APP_REGION",
  "APP_ROLE",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
] as const;

export async function saveApiSecret(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "").trim();

  if (!key || !value) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminSettingsAction("saveApiSecret", { key, value });
  } else {
    await performSaveApiSecret(key, value);
  }

  revalidatePath("/admin/settings");
}

export async function clearApiSecret(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "");

  if (!key) {
    return;
  }

  if (process.env.APP_ROLE === "ingress") {
    await postInternalAdminSettingsAction("clearApiSecret", { key });
  } else {
    await performClearApiSecret(key);
  }

  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
  const isIngress = process.env.APP_ROLE === "ingress";
  const { dbStatus, storedSecrets } = isIngress
    ? await fetchInternalAdminSettingsPageData()
    : await loadAdminSettingsPageData();
  const storedSecretMap = new Map(
    storedSecrets.map((secret) => [secret.key, secret]),
  );
  const rows = envKeys.map((key) => {
    const envValue = isIngress ? undefined : process.env[key];

    return {
      key,
      preview:
        storedSecretMap.get(key)?.valuePreview ??
        (envValue ? maskSecretValue(envValue) : "-"),
      source: storedSecretMap.has(key)
        ? "РђРґРјРёРЅРєР°"
        : envValue
          ? "РћРєСЂСѓР¶РµРЅРёРµ"
          : "-",
      status:
        storedSecretMap.has(key) || envValue
          ? "Р—Р°РґР°РЅРѕ"
          : "РќРµ Р·Р°РґР°РЅРѕ",
    };
  });
  const databaseStatus =
    dbStatus === "ok" ? "РџРѕРґРєР»СЋС‡РµРЅР°" : "РќРµРґРѕСЃС‚СѓРїРЅР°";

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Runtime-РЅР°СЃС‚СЂРѕР№РєРё РїСЂРёР»РѕР¶РµРЅРёСЏ. Р—РЅР°С‡РµРЅРёСЏ СЃРµРєСЂРµС‚РѕРІ РЅРёРєРѕРіРґР° РЅРµ РїРѕРєР°Р·С‹РІР°СЋС‚СЃСЏ РїРѕР»РЅРѕСЃС‚СЊСЋ."
        title="РќР°СЃС‚СЂРѕР№РєРё"
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <AdminPanel>
          <p className="text-sm text-[#97a4b8]">Р‘Р°Р·Р° РґР°РЅРЅС‹С…</p>
          <p className="mt-2 text-2xl font-semibold text-[#f4f7fb]">
            {databaseStatus}
          </p>
          <p className="mt-2 text-xs text-[#7f8da3]">
            РџСЂРѕРІРµСЂСЏРµС‚СЃСЏ РєРѕСЂРѕС‚РєРёРј Р·Р°РїСЂРѕСЃРѕРј Рє PostgreSQL.
          </p>
        </AdminPanel>

        <AdminPanel className="space-y-4">
          <AdminSectionTitle
            description="Р—РґРµСЃСЊ РјРѕР¶РЅРѕ РїРµСЂРµРѕРїСЂРµРґРµР»РёС‚СЊ РєР»СЋС‡Рё OpenAI, OpenRouter Рё Fal AI Р±РµР· РїРѕРєР°Р·Р° РїРѕР»РЅРѕРіРѕ Р·РЅР°С‡РµРЅРёСЏ."
            title="API-РєР»СЋС‡Рё"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {managedApiKeys.map((key) => {
              const storedSecret = storedSecretMap.get(key);
              const envValue = isIngress ? undefined : process.env[key];
              const preview =
                storedSecret?.valuePreview ??
                (envValue ? maskSecretValue(envValue) : "РќРµ Р·Р°РґР°РЅРѕ");

              return (
                <form action={saveApiSecret} className="space-y-3" key={key}>
                  <input name="key" type="hidden" value={key} />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-[#f4f7fb]">
                        {key}
                      </p>
                      <p className="text-xs text-[#97a4b8]">{preview}</p>
                    </div>
                    <AdminButton
                      formAction={clearApiSecret}
                      type="submit"
                      variant="secondary"
                    >
                      РћС‡РёСЃС‚РёС‚СЊ
                    </AdminButton>
                  </div>
                  <div className="flex gap-2">
                    <AdminField label="РќРѕРІС‹Р№ РєР»СЋС‡">
                      <AdminInput
                        name="value"
                        placeholder="Р’СЃС‚Р°РІСЊС‚Рµ РЅРѕРІС‹Р№ РєР»СЋС‡"
                        type="password"
                      />
                    </AdminField>
                    <div className="flex items-end">
                      <AdminButton type="submit">РЎРѕС…СЂР°РЅРёС‚СЊ</AdminButton>
                    </div>
                  </div>
                </form>
              );
            })}
          </div>
        </AdminPanel>
      </div>

      <DataTable
        columns={[
          { header: "РџРµСЂРµРјРµРЅРЅР°СЏ", cell: (row) => row.key },
          { header: "РЎС‚Р°С‚СѓСЃ", cell: (row) => row.status },
          { header: "РСЃС‚РѕС‡РЅРёРє", cell: (row) => row.source },
          { header: "РџСЂРµРІСЊСЋ", cell: (row) => row.preview },
        ]}
        empty="РџРµСЂРµРјРµРЅРЅС‹Рµ РєРѕРЅС„РёРіСѓСЂР°С†РёРё РЅРµ Р·Р°РґР°РЅС‹."
        getKey={(row) => row.key}
        rows={rows}
      />
    </section>
  );
}
