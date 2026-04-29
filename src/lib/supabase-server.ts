import { createClient } from "@supabase/supabase-js";
import { validateSyncEnv } from "@/lib/sync-env";

export function getSupabaseServiceClient() {
  const env = validateSyncEnv();
  if (!env.supabaseConfigured || !env.supabaseUrl || !env.serviceRoleKey) return null;
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

