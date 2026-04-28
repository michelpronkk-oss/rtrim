import { NextResponse } from "next/server";
import { SyncPayloadSchema } from "@/lib/runtrim-sync";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const expected = process.env.RUNTRIM_SYNC_SECRET;
  const provided = request.headers.get("x-runtrim-sync-token");

  if (!expected) {
    return NextResponse.json(
      { error: "Server sync secret is not configured." },
      { status: 503 }
    );
  }

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized sync token." }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service configuration missing." },
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

  const runRows = payload.runs.map((run) => ({
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
    next_safe_prompt: run.nextSafePrompt,
    synced_at: new Date().toISOString(),
  }));

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

