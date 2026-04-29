import "server-only";
import { getSupabaseServiceClient } from "./supabase-server";

export type SyncedRunsError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type SyncedRunsResult = {
  runs: unknown[];
  error: SyncedRunsError | null;
};

export type SyncedRun = {
  local_id: string;
  task: string | null;
  status: string | null;
  created_at_local: string | null;
  risk_before: string | null;
  risk_after: string | null;
  changed_files: string[] | null;
  watch_status: string | null;
  watch_warnings: string[] | null;
  watch_changed_files: string[] | null;
  next_safe_prompt: string | null;
  latest_prompt: string | null;
  continuation_prompt: string | null;
};

export type SyncedProjectBundle = {
  project: {
    id: string;
    name: string;
    stack: string[] | null;
    package_manager: string | null;
    last_status: string | null;
    last_task: string | null;
    next_safe_action: string | null;
    next_safe_prompt: string | null;
    estimated_tokens_trimmed: number | null;
    estimated_dollars_standard: number | null;
    estimated_dollars_expensive: number | null;
    updated_at: string | null;
  };
  memory: {
    markdown: string | null;
    current_state: string | null;
    previous_task: string | null;
    latest_status: string | null;
    next_safe_action: string | null;
    next_safe_prompt: string | null;
  } | null;
  runs: SyncedRun[];
};

export async function getLatestSyncedProject(): Promise<SyncedProjectBundle | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const { data: project, error } = await supabase
    .from("runtrim_projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !project) return null;

  const [{ data: memory }, { data: runs }] = await Promise.all([
    supabase
      .from("runtrim_project_memory")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("runtrim_runs")
      .select("*")
      .eq("project_id", project.id)
      .order("synced_at", { ascending: false })
      .limit(20),
  ]);

  return {
    project,
    memory: memory ?? null,
    runs: (runs ?? []) as SyncedRun[],
  };
}

export async function getSyncedProjects() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("runtrim_projects")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getSyncedRuns() {
  const result = await getSyncedRunsResult();
  return result.runs;
}

export async function getSyncedRunsResult(): Promise<SyncedRunsResult> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { runs: [], error: null };
  const { data, error } = await supabase
    .from("runtrim_runs")
    .select("*")
    .order("synced_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to load synced runs", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      runs: [],
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    };
  }

  return { runs: data ?? [], error: null };
}
