import { NextResponse } from "next/server";
import { SyncPayloadSchema } from "@/lib/runtrim-sync";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSyncEnv } from "@/lib/sync-env";

export const runtime = "nodejs";

function methodNotAllowed() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed. Use POST for sync." },
    { status: 405 }
  );
}

export async function GET() {
  const env = validateSyncEnv();
  const response: {
    ok: true;
    route: "/api/sync";
    method: "GET";
    message: string;
    supabaseConfigured: boolean;
    syncSecretConfigured: boolean;
    missing?: string[];
  } = {
    ok: true,
    route: "/api/sync",
    method: "GET",
    message:
      "RunTrim sync endpoint is online. Use POST from the RunTrim CLI to sync metadata.",
    supabaseConfigured: env.supabaseConfigured,
    syncSecretConfigured: env.syncSecretConfigured,
  };

  if (env.missing.length > 0) response.missing = env.missing;

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const env = validateSyncEnv();
  const expected = env.syncSecret;
  const provided = request.headers.get("x-runtrim-sync-token");

  if (!env.syncSecretConfigured || !expected) {
    const missing = env.missing.filter((name) => name === "RUNTRIM_SYNC_SECRET");
    return NextResponse.json(
      {
        ok: false,
        error: "Sync secret configuration missing.",
        missing,
      },
      { status: 503 }
    );
  }

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized sync token." }, { status: 401 });
  }

  if (!env.supabaseConfigured) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase service configuration missing.",
        missing: env.missing.filter(
          (name) =>
            name === "NEXT_PUBLIC_SUPABASE_URL" || name === "SUPABASE_SERVICE_ROLE_KEY"
        ),
      },
      { status: 503 }
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase service configuration missing.",
        missing: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      },
      { status: 503 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = SyncPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const latestRun = payload.runs[0] ?? null;
  const totalTokens = payload.runs.reduce((sum, run) => sum + run.estimatedTokensTrimmed, 0);
  const totalStd = payload.runs.reduce((sum, run) => sum + run.estimatedDollarsStandard, 0);
  const totalExp = payload.runs.reduce((sum, run) => sum + run.estimatedDollarsExpensive, 0);

  const { data: projectData, error: projectError } = await supabase
    .from("runtrim_projects")
    .upsert(
      {
        local_project_id: payload.project.localProjectId,
        name: payload.project.name,
        stack: payload.project.stack,
        package_manager: payload.project.packageManager,
        last_status: latestRun?.status ?? payload.memory.latestStatus,
        last_task: latestRun?.task ?? payload.memory.previousTask,
        next_safe_action: payload.memory.nextSafeAction,
        next_safe_prompt: payload.memory.nextSafePrompt,
        estimated_tokens_trimmed: totalTokens,
        estimated_dollars_standard: Number(totalStd.toFixed(4)),
        estimated_dollars_expensive: Number(totalExp.toFixed(4)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "local_project_id" }
    )
    .select("id")
    .single();

  if (projectError || !projectData?.id) {
    return NextResponse.json(
      { error: "Failed to upsert project.", detail: projectError?.message },
      { status: 500 }
    );
  }

  const projectId = projectData.id as string;

  const { error: memoryError } = await supabase.from("runtrim_project_memory").upsert(
    {
      project_id: projectId,
      markdown: payload.memory.markdown,
      current_state: payload.memory.currentState,
      previous_task: payload.memory.previousTask,
      latest_status: payload.memory.latestStatus,
      next_safe_action: payload.memory.nextSafeAction,
      next_safe_prompt: payload.memory.nextSafePrompt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );

  if (memoryError) {
    return NextResponse.json(
      { error: "Failed to upsert memory.", detail: memoryError.message },
      { status: 500 }
    );
  }

  const runRows = payload.runs.map((run) => {
    const status = (run.status || "").toLowerCase();
    const resolvedNextSafePrompt =
      run.nextSafePrompt ??
      (status === "guarded" && run.latestPrompt ? run.latestPrompt : null) ??
      run.fallbackNextPrompt ??
      null;
    return {
      project_id: projectId,
      local_id: run.localId,
      task: run.task,
      status: run.status,
      created_at_local: run.createdAt,
      evaluated_at_local: run.evaluatedAt,
      risk_before: run.riskBefore,
      risk_after: run.riskAfter,
      score_before: run.scoreBefore,
      score_after: run.scoreAfter,
      risk_reduction_percent: run.riskReductionPercent,
      estimated_tokens_trimmed: run.estimatedTokensTrimmed,
      estimated_dollars_standard: run.estimatedDollarsStandard,
      estimated_dollars_expensive: run.estimatedDollarsExpensive,
      changed_files: run.changedFiles,
      missing_proof_items: run.missingProofItems,
      detected_risks: run.detectedRisks,
      sensitive_areas: run.sensitiveAreas,
      watch_status: run.watchStatus,
      watch_warnings: run.watchWarnings,
      watch_changed_files: run.watchChangedFiles,
      next_safe_prompt: resolvedNextSafePrompt,
      latest_prompt: run.latestPrompt,
      continuation_prompt: run.continuationPrompt,
      synced_at: new Date().toISOString(),
    };
  });

  if (runRows.length > 0) {
    const { error: runsError } = await supabase
      .from("runtrim_runs")
      .upsert(runRows, { onConflict: "project_id,local_id" });
    if (runsError) {
      return NextResponse.json(
        { error: "Failed to upsert runs.", detail: runsError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    syncedRuns: runRows.length,
    projectId,
  });
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

export async function HEAD() {
  return methodNotAllowed();
}

export async function OPTIONS() {
  return methodNotAllowed();
}
