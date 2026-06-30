import {
  AdminPageHeader,
  DataTable,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";
import {
  encryptApiSecretValue,
  getSecretEncryptionKey,
  managedApiKeys,
  maskSecretValue,
  type ManagedApiKey,
} from "@/lib/api-secrets";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const envKeys = [
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "FAL_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
];

function isManagedApiKey(key: string): key is ManagedApiKey {
  return managedApiKeys.includes(key as ManagedApiKey);
}

export async function saveApiSecret(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "").trim();

  if (!isManagedApiKey(key) || !value) {
    return;
  }

  await prisma.apiSecret.upsert({
    where: { key },
    update: {
      encryptedValue: encryptApiSecretValue(value, getSecretEncryptionKey()),
      valuePreview: maskSecretValue(value),
    },
    create: {
      key,
      encryptedValue: encryptApiSecretValue(value, getSecretEncryptionKey()),
      valuePreview: maskSecretValue(value),
    },
  });

  revalidatePath("/admin/settings");
}

export async function clearApiSecret(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "");

  if (!isManagedApiKey(key)) {
    return;
  }

  await prisma.apiSecret.deleteMany({ where: { key } });
  revalidatePath("/admin/settings");
}

async function getDatabaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "Connected";
  } catch {
    return "Unavailable";
  }
}

export default async function AdminSettingsPage() {
  const storedSecrets = await prisma.apiSecret.findMany({
    select: {
      key: true,
      valuePreview: true,
      updatedAt: true,
    },
  });
  const storedSecretMap = new Map(
    storedSecrets.map((secret) => [secret.key, secret]),
  );
  const rows = envKeys.map((key) => ({
    key,
    preview:
      storedSecretMap.get(key)?.valuePreview ??
      (process.env[key] ? maskSecretValue(process.env[key] ?? "") : "-"),
    source: storedSecretMap.has(key)
      ? "Admin"
      : process.env[key]
        ? "Environment"
        : "-",
    status: storedSecretMap.has(key) || process.env[key] ? "Set" : "Missing",
  }));
  const databaseStatus = await getDatabaseStatus();

  return (
    <section className="space-y-5">
      <AdminPageHeader
        description="Runtime configuration status. Secret values are never shown."
        title="Settings"
      />
      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-sm text-muted-foreground">Database</p>
        <p className="mt-1 text-lg font-semibold">{databaseStatus}</p>
      </div>
      <div className="rounded-lg border border-border bg-white p-5">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {managedApiKeys.map((key) => {
            const storedSecret = storedSecretMap.get(key);
            const envValue = process.env[key];
            const preview =
              storedSecret?.valuePreview ??
              (envValue ? maskSecretValue(envValue) : "Missing");

            return (
              <form action={saveApiSecret} className="space-y-3" key={key}>
                <input name="key" type="hidden" value={key} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-medium">{key}</p>
                    <p className="text-xs text-muted-foreground">{preview}</p>
                  </div>
                  <button
                    className="rounded-md border border-border px-3 py-2 text-sm"
                    formAction={clearApiSecret}
                    type="submit"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    name="value"
                    placeholder="Paste new key"
                    type="password"
                  />
                  <button
                    className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
                    type="submit"
                  >
                    Save
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </div>
      <DataTable
        columns={[
          { header: "Variable", cell: (row) => row.key },
          { header: "Status", cell: (row) => row.status },
          { header: "Source", cell: (row) => row.source },
          { header: "Preview", cell: (row) => row.preview },
        ]}
        empty="No configuration variables are defined."
        getKey={(row) => row.key}
        rows={rows}
      />
    </section>
  );
}
