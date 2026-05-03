import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { SyncPayloadSchema } from "@/lib/runtrim-sync";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateSyncEnv } from "@/lib/sync-env";
import { getEntitlements, FREE_SYNC_RUN_LIMIT } from "@/lib/entitlements";

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

  if (!env.supabaseConfigured) {
    return NextResponse.json(
      { ok: false, error: "Supabase service configuration missing.", missing: env.missing },
      { status: 503 }
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase service configuration missing." }, { status: 503 });
  }

  // ── Auth: accept Bearer token (user sync) or shared secret (legacy) ──────
  let userId: string | null = null;

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const legacyToken = request.headers.get("x-runtrim-sync-token");

  if (bearerToken) {
    if (!bearerToken.startsWith("rt_live_")) {
      return NextResponse.json({ ok: false, error: "Invalid token format." }, { status: 401 });
    }

    const tokenHash = createHash("sha256").update(bearerToken).digest("hex");
    const { data: profile } = await supabase
      .from("runtrim_profiles")
      .select("id, plan")
      .eq("cli_token_hash", tokenHash)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ ok: false, error: "Invalid or expired CLI token." }, { status: 401 });
    }

    userId = profile.id as string;

    // ── Plan gating for cloud sync ──────────────────────────────────────
    const plan = (profile.plan as string) || "free";
    const ents = getEntitlements(plan);

    if (ents.cloudSyncRunLimit !== null) {
      // Free plan: count how many runs are already synced for this user
      const { count: existingCount } = await supabase
        .from("runtrim_runs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((existingCount ?? 0) >= FREE_SYNC_RUN_LIMIT) {
        return NextResponse.json(
          {
            ok: false,
            code: "sync_limit_reached",
            error: `Upgrade to Pro to sync unlimited RunTrim Bridge sessions. Free plan includes ${FREE_SYNC_RUN_LIMIT} synced runs during beta.`,
            upgradeUrl: "https://www.runtrim.com/pricing",
          },
          { status: 402 }
        );
      }
    }

    // Fire-and-forget: update last used timestamp
    supabase
      .from("runtrim_profiles")
      .update({ cli_token_last_used_at: new Date().toISOString() })
      .eq("id", userId)
      .then(() => {});
  } else if (legacyToken) {
    // Legacy shared-secret path (existing CLI before user tokens)
    const expected = env.syncSecret;
    if (!env.syncSecretConfigured || !expected) {
      return NextResponse.json({ ok: false, error: "Sync secret not configured." }, { status: 503 });
    }
    if (legacyToken !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized sync token." }, { status: 401 });
    }
    // userId stays null → runs stored without user association
  } else {
    return NextResponse.json(
      { ok: false, error: "Authorization required. Use Bearer token or x-runtrim-sync-token." },
      { status: 401 }
    );
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
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
  const totalStd    = payload.runs.reduce((sum, run) => sum + run.estimatedDollarsStandard, 0);
  const totalExp    = payload.runs.reduce((sum, run) => sum + run.estimatedDollarsExpensive, 0);

  const projectFields = {
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
  };

  // ── Project upsert ────────────────────────────────────────────────────────
  let projectId: string;

  if (userId) {
    // User-scoped: SELECT first, then INSERT or UPDATE
    const { data: existing } = await supabase
      .from("runtrim_projects")
      .select("id")
      .eq("user_id", userId)
      .eq("local_project_id", payload.project.localProjectId)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("runtrim_projects").update(projectFields).eq("id", existing.id);
      projectId = existing.id as string;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("runtrim_projects")
        .insert({ ...projectFields, user_id: userId })
        .select("id")
        .single();

      if (insertErr || !inserted?.id) {
        return NextResponse.json(
          { error: "Failed to create project.", detail: insertErr?.message },
          { status: 500 }
        );
      }
      projectId = inserted.id as string;
    }
  } else {
    // Legacy: upsert by local_project_id only (no user isolation)
    const { data: projectData, error: projectError } = await supabase
      .from("runtrim_projects")
      .upsert(projectFields, { onConflict: "local_project_id" })
      .select("id")
      .single();

    if (projectError || !projectData?.id) {
      return NextResponse.json(
        { error: "Failed to upsert project.", detail: projectError?.message },
        { status: 500 }
      );
    }
    projectId = projectData.id as string;
  }

  // ── Memory upsert ─────────────────────────────────────────────────────────
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

  // ── Runs upsert ───────────────────────────────────────────────────────────
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
      // Bridge Mode fields (only set when present)
      ...(run.goal                !== undefined ? { goal: run.goal } : {}),
      ...(run.allowedScope        !== undefined ? { allowed_scope: run.allowedScope } : {}),
      ...(run.forbiddenScope      !== undefined ? { forbidden_scope: run.forbiddenScope } : {}),
      ...(run.stopConditions      !== undefined ? { stop_conditions: run.stopConditions } : {}),
      ...(run.memoryUsed          !== undefined ? { memory_used: run.memoryUsed } : {}),
      ...(run.memorySummary       !== undefined ? { memory_summary: run.memorySummary } : {}),
      ...(run.tokenBudget         !== undefined ? { token_budget: run.tokenBudget } : {}),
      ...(run.scopeDriftStatus    !== undefined ? { scope_drift_status: run.scopeDriftStatus } : {}),
      ...(run.reportSummary       !== undefined ? { report_summary: run.reportSummary } : {}),
      ...(userId ? { user_id: userId } : {}),
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
    userId: userId ?? undefined,
  });
}

export async function PUT()    { return methodNotAllowed(); }
export async function PATCH()  { return methodNotAllowed(); }
export async function DELETE() { return methodNotAllowed(); }
export async function HEAD()   { return methodNotAllowed(); }
export async function OPTIONS(){ return methodNotAllowed(); }
