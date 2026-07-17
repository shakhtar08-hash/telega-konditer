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
  const { dbStatus, storedSecrets } = process.env.APP_ROLE === "ingress"
    ? await fetchInternalAdminSettingsPageData()
    : await loadAdminSettingsPageData();
  const storedSecretMap = new Map(
    storedSecrets.map((secret) => [secret.key, secret]),
  );
  const rows = envKeys.map((key) => ({
    key,
    preview:
      storedSecretMap.get(key)?.valuePreview ??
      (process.env[key] ? maskSecretValue(process.env[key] ?? "") : "-"),
    source: storedSecretMap.has(key)
      ? "Админка"
      : process.env[key]
        ? "Окружение"
        : "-",
    status:
      storedSecretMap.has(key) || process.env[key]
        ? "Задано"
        : "Не задано",
  }));
  const databaseStatus =
    dbStatus === "ok" ? "Подключена" : "Недоступна";

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Runtime-настройки приложения. Значения секретов никогда не показываются полностью."
        title="Настройки"
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <AdminPanel>
          <p className="text-sm text-[#97a4b8]">База данных</p>
          <p className="mt-2 text-2xl font-semibold text-[#f4f7fb]">
            {databaseStatus}
          </p>
          <p className="mt-2 text-xs text-[#7f8da3]">
            Проверяется коротким запросом к PostgreSQL.
          </p>
        </AdminPanel>

        <AdminPanel className="space-y-4">
          <AdminSectionTitle
            description="Здесь можно переопределить ключи OpenAI, OpenRouter и Fal AI без показа полного значения."
            title="API-ключи"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {managedApiKeys.map((key) => {
              const storedSecret = storedSecretMap.get(key);
              const envValue = process.env[key];
              const preview =
                storedSecret?.valuePreview ??
                (envValue ? maskSecretValue(envValue) : "Не задано");

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
                      Очистить
                    </AdminButton>
                  </div>
                  <div className="flex gap-2">
                    <AdminField label="Новый ключ">
                      <AdminInput
                        name="value"
                        placeholder="Вставьте новый ключ"
                        type="password"
                      />
                    </AdminField>
                    <div className="flex items-end">
                      <AdminButton type="submit">Сохранить</AdminButton>
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
          { header: "Переменная", cell: (row) => row.key },
          { header: "Статус", cell: (row) => row.status },
          { header: "Источник", cell: (row) => row.source },
          { header: "Превью", cell: (row) => row.preview },
        ]}
        empty="Переменные конфигурации не заданы."
        getKey={(row) => row.key}
        rows={rows}
      />
    </section>
  );
}
