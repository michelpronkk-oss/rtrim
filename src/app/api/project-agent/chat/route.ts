import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";

export const runtime = "nodejs";

type ProfileRow = {
  plan: string | null;
  plan_status: string | null;
  current_period_end: string | null;
};

type ChangedFileRow = string | { path?: string | null; status?: string | null };

type RunRow = {
  id: string;
  task: string | null;
  status: string | null;
  risk_before: string | null;
  risk_after: string | null;
  changed_files: ChangedFileRow[] | null;
  missing_proof_items: string[] | null;
  detected_risks: string[] | null;
  sensitive_areas: string[] | null;
  next_safest_step: string | null;
  allowed_scope: string[] | null;
  forbidden_scope: string[] | null;
  stop_conditions: string[] | null;
  estimated_tokens_trimmed: number | null;
  estimated_tokens_saved: number | null;
  estimated_dollars_standard: number | null;
  estimated_cost_saved: number | null;
  created_at_local: string | null;
  evaluated_at_local: string | null;
  created_at: string | null;
  synced_at: string | null;
};

type Intent =
  | "testing"
  | "latest_run"
  | "next_action"
  | "proof_gaps"
  | "safe_contract"
  | "handoff"
  | "risk"
  | "savings"
  | "scope"
  | "summary";

type Context = {
  plan: string;
  runCount: number;
  latestRun: RunRow | null;
  unfinishedChanges: boolean;
  estimatedTokensSaved: number;
  estimatedCostSaved: number;
  sensitiveFiles: string[];
};

function toTimeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function runSortTime(run: RunRow): number {
  return (
    toTimeMs(run.evaluated_at_local) ||
    toTimeMs(run.created_at_local) ||
    toTimeMs(run.created_at) ||
    toTimeMs(run.synced_at)
  );
}

function parseChangedPath(entry: ChangedFileRow): string | null {
  if (typeof entry === "string") {
    const match = entry.match(/^\s*(added|modified|deleted|renamed)\s*[:|-]\s*(.+)$/i);
    return (match ? match[2] : entry).trim() || null;
  }
  return entry.path?.trim() || null;
}

function classifyIntent(message: string): Intent {
  const text = message.toLowerCase();
  if (text === "test" || text === "testing" || text.includes("just testing")) return "testing";
  if (text.includes("latest run") || text.includes("what happened")) return "latest_run";
  if (text.includes("what should i do next") || text.includes("next safe") || text.includes("next step")) return "next_action";
  if (text.includes("proof") || text.includes("before deploy")) return "proof_gaps";
  if (text.includes("safe contract") || text.includes("create contract")) return "safe_contract";
  if (text.includes("handoff") || text.includes("claude") || text.includes("codex") || text.includes("cursor")) return "handoff";
  if (text.includes("risky") || text.includes("risk")) return "risk";
  if (text.includes("token") || text.includes("cost") || text.includes("save")) return "savings";
  if (text.includes("scope")) return "scope";
  return "summary";
}

function formatRunDate(run: RunRow): string {
  const when = runSortTime(run);
  if (!when) return "not captured";
  return new Date(when).toLocaleString();
}

function noRunsGuidance(opening: string): { answer: string; actions: string[] } {
  return {
    answer: [
      opening,
      "",
      "Suggested first run:",
      'runtrim go "your task"',
      "",
      "After edits:",
      "runtrim finish",
      "",
      "Once that is synced, I can explain risks, proof gaps, changed files, and your next safe step.",
    ].join("\n"),
    actions: ['runtrim go "your task"', "runtrim finish"],
  };
}

function buildContractSuggestion(message: string): { answer: string; actions: string[] } {
  const objective = message
    .replace(/create\s+a?\s*safe\s*contract\s*(for)?/i, "")
    .replace(/create\s+contract\s*(for)?/i, "")
    .trim() || "your scoped task";

  const command = `runtrim go \"ONLY EDIT files directly tied to: ${objective}. Do not touch auth, billing, webhooks, database, or env.\"`;

  return {
    answer: [
      "Here is a safe RunTrim contract direction for that task.",
      "",
      "Suggested command:",
      command,
      "",
      "Allowed scope:",
      "- Files directly related to the target task",
      "- Small adjacent helpers only when required",
      "",
      "Forbidden:",
      "- Auth internals",
      "- Billing/payments",
      "- Webhooks",
      "- Database schema and migrations",
      "- Environment/secrets",
      "",
      "Stop rules:",
      "- Stop if more than 5 files are required",
      "- Stop before touching forbidden areas",
      "- Stop if root cause is ambiguous",
      "",
      "Proof required:",
      "- npm run build",
      "- Targeted manual verification for the changed flow",
    ].join("\n"),
    actions: [command, "runtrim finish"],
  };
}

function buildHandoff(context: Context): { answer: string; actions: string[] } {
  const latest = context.latestRun;
  return {
    answer: [
      "Use this handoff with Claude/Codex/Cursor.",
      "",
      "Context:",
      `- Latest run: ${latest?.task ?? "No synced run yet"}`,
      `- Risk: ${latest?.risk_after ?? latest?.risk_before ?? "not captured"}`,
      `- Recent runs: ${context.runCount}`,
      "",
      "Objective:",
      "- Complete the requested task while staying in contract scope",
      "",
      "Scope:",
      "- Read .runtrim/contracts/latest.md before editing",
      "- Stay in allowed scope only",
      "- Stop if scope expansion is required",
      "",
      "Proof required:",
      "- npm run build",
      "- Manual verification for changed behavior",
      "- Document any remaining proof gaps",
      "",
      "After edits:",
      "runtrim finish",
    ].join("\n"),
    actions: ["Copy this handoff into your coding agent", "runtrim finish"],
  };
}

function buildAnswer(intent: Intent, context: Context, originalMessage: string): { answer: string; actions: string[] } {
  const latest = context.latestRun;

  if (!latest) {
    if (intent === "testing") {
      return noRunsGuidance(
        "Project Agent is working. I do not have synced run history for this project yet, so I can only give setup guidance right now.",
      );
    }

    if (intent === "next_action") {
      return noRunsGuidance(
        "The best next step is to create the first synced run. Without run history, I cannot safely infer project risk yet.",
      );
    }

    if (intent === "latest_run") {
      return noRunsGuidance(
        "I do not have a synced latest run yet. Create one guarded run first so I can explain task, scope, changed files, proof gaps, and next action.",
      );
    }

    if (intent === "proof_gaps") {
      return noRunsGuidance(
        "I cannot inspect proof gaps until a run is synced. Once available, I will check build, tests, manual verification, logs, scope compliance, and finish evidence.",
      );
    }

    if (intent === "risk") {
      return {
        answer: [
          "I have not learned project-specific risky files yet.",
          "",
          "Common high-risk areas are auth, billing, webhooks, database, middleware, environment files, and migrations.",
          "",
          "To get project-specific risk mapping, run:",
          'runtrim go "your task"',
          "runtrim finish",
        ].join("\n"),
        actions: ['runtrim go "your task"', "runtrim finish"],
      };
    }

    if (intent === "safe_contract") return buildContractSuggestion(originalMessage);
    if (intent === "handoff") return buildHandoff(context);

    return noRunsGuidance(
      "I can help, but I do not have synced project history yet. Run one guarded task first, then I can reason from your real context.",
    );
  }

  const latestRisk = latest.risk_after ?? latest.risk_before ?? "not captured";
  const proofGaps = latest.missing_proof_items ?? [];
  const changedFiles = (latest.changed_files ?? [])
    .map(parseChangedPath)
    .filter((item): item is string => Boolean(item));

  switch (intent) {
    case "testing":
      return {
        answer: [
          "Project Agent is working and using your synced context.",
          "",
          `Latest run: ${latest.task ?? "Untitled run"}`,
          `Risk: ${latestRisk}`,
          `Proof gaps: ${proofGaps.length}`,
          "",
          "Ask for the next safe step, a contract suggestion, or a coding-agent handoff.",
        ].join("\n"),
        actions: ["Ask: What should I do next?", "Ask: Create a Claude handoff"],
      };

    case "latest_run":
      return {
        answer: [
          `Latest run summary: ${latest.task ?? "Untitled run"}.`,
          "",
          `Status: ${latest.status ?? "not captured"}`,
          `Risk: ${latestRisk}`,
          `Changed files: ${changedFiles.length}`,
          `Proof gaps: ${proofGaps.length}`,
          `Evaluated: ${formatRunDate(latest)}`,
          "",
          "Next safe action:",
          latest.next_safest_step ?? "Close proof gaps, then run runtrim finish.",
        ].join("\n"),
        actions: ["Open /app/runs for full history", "Review the latest run report"],
      };

    case "next_action": {
      const next = latest.next_safest_step ?? "Close the latest proof gaps before starting new implementation work.";
      return {
        answer: [
          "The safest next step is to complete verification on your latest run before expanding scope.",
          "",
          "Suggested next step:",
          next,
          "",
          "Why:",
          `- Latest risk: ${latestRisk}`,
          `- Proof gaps: ${proofGaps.length}`,
          `- Unfinished changes: ${context.unfinishedChanges ? "yes" : "no"}`,
        ].join("\n"),
        actions: [context.unfinishedChanges ? "runtrim finish" : 'runtrim go "narrow scoped next task"'],
      };
    }

    case "proof_gaps":
      return {
        answer: proofGaps.length
          ? [
              "These proof items are still missing before calling this run complete:",
              ...proofGaps.map((item) => `- ${item}`),
              "",
              "Next verification steps:",
              "- npm run build",
              "- Validate the affected flow manually",
              "- Re-run runtrim finish to capture proof",
            ].join("\n")
          : [
              "No explicit proof gaps are recorded on the latest run.",
              "",
              "Final check before closing:",
              "- npm run build",
              "- One manual smoke test of the touched flow",
            ].join("\n"),
        actions: ["Open latest run report", "runtrim finish"],
      };

    case "safe_contract":
      return buildContractSuggestion(originalMessage);

    case "handoff":
      return buildHandoff(context);

    case "risk": {
      const topRisks = [...new Set([...(latest.detected_risks ?? []), ...(latest.sensitive_areas ?? [])])].slice(0, 8);
      return {
        answer: [
          topRisks.length
            ? "These are the highest-risk areas from your recent run context:"
            : "No run-specific risk labels were captured, so use standard high-risk guardrails.",
          ...(topRisks.length ? topRisks.map((item) => `- ${item}`) : []),
          "",
          "High-risk categories usually include auth, billing, webhooks, database, middleware, and environment handling.",
          "",
          "Use narrow scope and strict stop rules when touching these areas.",
        ].join("\n"),
        actions: ['runtrim go "audit-only task in risky area"'],
      };
    }

    case "savings":
      return {
        answer: [
          "Estimated savings so far from synced runs:",
          `- Estimated tokens saved: ${context.estimatedTokensSaved.toLocaleString()}`,
          `- Estimated cost saved: $${context.estimatedCostSaved.toFixed(2)}`,
          "",
          "These values are estimated from captured run metrics.",
        ].join("\n"),
        actions: ["Open /app/runs to inspect savings by run"],
      };

    case "scope": {
      const allowed = latest.allowed_scope ?? [];
      const forbidden = latest.forbidden_scope ?? [];
      const stopRules = latest.stop_conditions ?? [];
      return {
        answer: [
          "Scope check for the latest run:",
          `- Allowed scope entries: ${allowed.length}`,
          `- Forbidden scope entries: ${forbidden.length}`,
          `- Stop rules: ${stopRules.length}`,
          `- Changed files captured: ${changedFiles.length}`,
          "",
          changedFiles.length
            ? "Review changed files against allowed and forbidden scope before continuing."
            : "No changed files were captured on the latest run.",
        ].join("\n"),
        actions: ["Open latest run report for scope verification"],
      };
    }

    default:
      return {
        answer: [
          "Here is the current project context I can rely on:",
          `- Plan: ${context.plan}`,
          `- Recent synced runs: ${context.runCount}`,
          `- Latest run: ${latest.task ?? "Untitled run"}`,
          `- Risk: ${latestRisk}`,
          `- Proof gaps: ${proofGaps.length}`,
          "",
          "If you want, I can now generate a safe contract suggestion or a Claude handoff.",
        ].join("\n"),
        actions: ["Ask: Create a safe contract", "Ask: Create a Claude handoff"],
      };
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ ok: false, error: "missing_message" }, { status: 400 });
  }

  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes("deploy") ||
    lowerMessage.includes("edit code") ||
    lowerMessage.includes("run this command") ||
    lowerMessage.includes("execute") ||
    lowerMessage.includes("bypass guard") ||
    lowerMessage.includes("cancel subscription")
  ) {
    return NextResponse.json({
      ok: true,
      answer:
        "I cannot execute or deploy from Project Agent. I can prepare a safe contract or handoff you can run through RunTrim.",
      actions: ['runtrim go "your task"', "Ask: Create a Claude handoff"],
      contextUsed: { intent: "safety_redirect" },
    });
  }

  const [profileResult, runResult] = await Promise.all([
    supabase
      .from("runtrim_profiles")
      .select("plan, plan_status, current_period_end")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("runtrim_runs")
      .select("id, task, status, risk_before, risk_after, changed_files, missing_proof_items, detected_risks, sensitive_areas, next_safest_step, allowed_scope, forbidden_scope, stop_conditions, estimated_tokens_trimmed, estimated_tokens_saved, estimated_dollars_standard, estimated_cost_saved, created_at_local, evaluated_at_local, created_at, synced_at")
      .eq("user_id", user.id)
      .limit(30),
  ]);

  const profile = (profileResult.data as ProfileRow | null) ?? null;
  const rawPlan = profile?.plan ?? "free";
  const planStatus = profile?.plan_status ?? null;
  const periodEnd = profile?.current_period_end ?? null;
  const plan = effectivePlanId(rawPlan, planStatus, periodEnd);

  if (plan === "free") {
    return NextResponse.json(
      {
        ok: false,
        error: "plan_required",
        answer: "Project Agent is available on paid plans. Start a 3-day Pro trial to unlock project-aware chat.",
      },
      { status: 403 },
    );
  }

  const runs = ((runResult.data as RunRow[] | null) ?? []).sort((a, b) => runSortTime(b) - runSortTime(a));
  const latest = runs[0] ?? null;

  const unfinishedChanges = runs.some((run) => {
    const status = (run.status ?? "").toLowerCase();
    return status === "partial" || status === "in_progress";
  });

  const sensitiveFiles = [...new Set(runs.flatMap((run) => run.sensitive_areas ?? []))].slice(0, 12);

  const context: Context = {
    plan,
    runCount: runs.length,
    latestRun: latest,
    unfinishedChanges,
    estimatedTokensSaved: runs.reduce(
      (sum, run) => sum + (run.estimated_tokens_saved ?? run.estimated_tokens_trimmed ?? 0),
      0,
    ),
    estimatedCostSaved: runs.reduce(
      (sum, run) => sum + (run.estimated_cost_saved ?? run.estimated_dollars_standard ?? 0),
      0,
    ),
    sensitiveFiles,
  };

  const intent = classifyIntent(message);
  const { answer, actions } = buildAnswer(intent, context, message);

  return NextResponse.json({
    ok: true,
    answer,
    actions,
    contextUsed: {
      intent,
      plan,
      runCount: context.runCount,
      latestRunId: context.latestRun?.id ?? null,
      latestRisk: context.latestRun?.risk_after ?? context.latestRun?.risk_before ?? null,
      latestProofGaps: context.latestRun?.missing_proof_items?.length ?? 0,
      sensitiveFileCount: context.sensitiveFiles.length,
      estimatesAreApproximate: true,
    },
  });
}
