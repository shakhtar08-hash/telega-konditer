import "dotenv/config";
import { defineConfig } from "prisma/config";

function getMigrationDatabaseUrl(): string {
  const databaseUrl =
    process.env["DIRECT_URL"] ??
    process.env["DATABASE_URL"] ??
    "postgresql://user:password@localhost:5432/pastry";
  const url = new URL(databaseUrl);

  if (url.hostname.includes("pooler.supabase.com")) {
    url.searchParams.set("pgbouncer", "true");
  }

  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getMigrationDatabaseUrl(),
  },
});
