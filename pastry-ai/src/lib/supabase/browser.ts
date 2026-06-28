import { createBrowserClient } from "@supabase/ssr";
import { loadEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = loadEnv();

  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
