import pg from "pg";

const c = new pg.Client({
  connectionString: "postgresql://postgres.lekiymtqiuwzlmviyjkh:oNIuem8fxtcp1KJa@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
});

await c.connect();

// 1. Update photoshoot prompt to use KIE + FLUX Kontext
await c.query(
  `UPDATE "Prompt" SET provider = 'kie', model = 'flux-kontext-pro'
   WHERE slug = 'product-photo' AND feature = 'photoshoot' AND active = true`
);

// 2. Delete KIE Kontext style
await c.query(
  `DELETE FROM "PhotoStyle" WHERE name = 'KIE Kontext'`
);

await c.end();

console.log("Done: prompt updated, KIE Kontext style deleted");