import {
  AdminPageHeader,
  DataTable,
} from "@/components/admin/data-table";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

const envKeys = [
  "OPENAI_API_KEY",
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

async function getDatabaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "Connected";
  } catch {
    return "Unavailable";
  }
}

export default async function AdminSettingsPage() {
  const rows = envKeys.map((key) => ({
    key,
    status: process.env[key] ? "Set" : "Missing",
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
      <DataTable
        columns={[
          { header: "Variable", cell: (row) => row.key },
          { header: "Status", cell: (row) => row.status },
        ]}
        empty="No configuration variables are defined."
        getKey={(row) => row.key}
        rows={rows}
      />
    </section>
  );
}
