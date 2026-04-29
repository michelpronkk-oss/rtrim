const SUPABASE_URL_PATTERN = /^https?:\/\//i;

export type SyncEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "RUNTRIM_SYNC_SECRET";

export type SyncEnvValidation = {
  missing: SyncEnvName[];
  supabaseConfigured: boolean;
  syncSecretConfigured: boolean;
  supabaseUrl: string | null;
  serviceRoleKey: string | null;
  syncSecret: string | null;
};

export function validateSyncEnv(): SyncEnvValidation {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
  const syncSecret = process.env.RUNTRIM_SYNC_SECRET?.trim() || null;

  const missing: SyncEnvName[] = [];

  if (!supabaseUrl || !SUPABASE_URL_PATTERN.test(supabaseUrl)) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!syncSecret) {
    missing.push("RUNTRIM_SYNC_SECRET");
  }

  return {
    missing,
    supabaseConfigured:
      !missing.includes("NEXT_PUBLIC_SUPABASE_URL") &&
      !missing.includes("SUPABASE_SERVICE_ROLE_KEY"),
    syncSecretConfigured: !missing.includes("RUNTRIM_SYNC_SECRET"),
    supabaseUrl,
    serviceRoleKey,
    syncSecret,
  };
}
