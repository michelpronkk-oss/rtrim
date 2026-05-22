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

function buildContractSuggestion(message: string): { answer: string; actions: string[] } {
  const objective = message
    .replace(/create\s+a?\s*safe\s*contract\s*(for)?/i, "")
    .replace(/create\s+contract\s*(for)?/i, "")
    .trim() || "narrow scoped task";

  const command = `runtrim go \"ONLY EDIT files directly tied to: ${objective}. Audit first. No unrelated refactors.\"`;

  return {
    answer: [
      "Here is a safe contract suggestion for this task:",
      "",
      `Suggested command: ${command}`,
      "",
      "Allowed scope:",
      "- Files directly referenced by the objective",
      "- Small helper files imported by those files when required",
      "",
      "Forbidden scope:",
      "- Auth internals",
      "- Billing or payment flows unless explicitly requested",
      "- Webhooks, database schema, and unrelated dashboard pages",
      "",
      "Stop rules:",
      "- Stop if more than 5 files are needed",
      "- Stop before touching forbidden areas",
      "- Stop if root cause is ambiguous",
      "",
      "Proof required:",
      "- npm run build",
      "- Targeted manual verification for the affected page/route",
    ].join("\n"),
    actions: [
      `Next: ${command}`,
      "After edits: runtrim finish",
    ],
  };
}

function buildHandoff(context: Context): { answer: string; actions: string[] } {
  const latest = context.latestRun;
  const latestTask = latest?.task ?? "No synced run yet";
  const latestRisk = latest?.risk_after ?? latest?.risk_before ?? "not captured";

  return {
    answer: [
      "RunTrim handoff draft for Claude/Codex:",
      "",
      "You are working inside a RunTrim guarded run.",
      "Before editing:",
      "- Read .runtrim/contracts/latest.md",
      "- Stay strictly in allowed scope",
      "- Stop if scope expansion is required",
      "",
      "Current context:",
      `- Latest run: ${latestTask}`,
      `- Latest risk: ${latestRisk}`,
      `- Recent runs: ${context.runCount}`,
      "",
      "Proof requirements:",
      "- npm run build",
      "- Validate behavior in the affected page/API route",
      "- Record remaining proof gaps honestly",
      "",
      "After edits:",
      "- Ask the user to run: runtrim finish",
    ].join("\n"),
    actions: [
      "Copy this handoff into your coding agent",
      "After edits: runtrim finish",
    ],
  };
}

function buildAnswer(intent: Intent, context: Context, originalMessage: string): { answer: string; actions: string[] } {
  const latest = context.latestRun;

  if (!latest) {
    return {
      answer: [
        "I do not have a synced run history yet for this project.",
        "",
        "Next safe action:",
        "1. Run a guarded task with runtrim go \"<task>\"",
        "2. Complete edits and run runtrim finish",
        "3. Sync runs so Project Agent can ground future answers",
      ].join("\n"),
      actions: [
        "runtrim go \"your task\"",
        "runtrim finish",
      ],
    };
  }

  const latestRisk = latest.risk_after ?? latest.risk_before ?? "not captured";
  const proofGaps = latest.missing_proof_items ?? [];
  const changedFiles = (latest.changed_files ?? [])
    .map(parseChangedPath)
    .filter((item): item is string => Boolean(item));

  switch (intent) {
    case "latest_run": {
      return {
        answer: [
          "Here is your latest synced run:",
          `- Task: ${latest.task ?? "Untitled run"}`,
          `- Status: ${latest.status ?? "not captured"}`,
          `- Risk: ${latestRisk}`,
          `- Files changed: ${changedFiles.length}`,
          `- Proof gaps: ${proofGaps.length}`,
          `- Evaluated: ${formatRunDate(latest)}`,
          "",
          `Next safe action: ${latest.next_safest_step ?? "Run verification and then use runtrim finish."}`,
        ].join("\n"),
        actions: [
          "Open /app/runs for full run history",
          "Open the latest run report to close proof gaps",
        ],
      };
    }
    case "next_action": {
      const next = latest.next_safest_step ?? "Close proof gaps before starting a new implementation task.";
      return {
        answer: [
          "Based on your current run context, the safest next step is:",
          next,
          "",
          "Reasoning:",
          `- Latest run risk: ${latestRisk}`,
          `- Proof gaps: ${proofGaps.length}`,
          `- Unfinished changes detected: ${context.unfinishedChanges ? "yes" : "no"}`,
          "",
          "If this is high risk, narrow scope before starting the next run.",
        ].join("\n"),
        actions: [
          context.unfinishedChanges ? "runtrim finish" : "runtrim go \"narrow scoped next task\"",
        ],
      };
    }
    case "proof_gaps": {
      return {
        answer: proofGaps.length
          ? [
              "Proof still missing before calling this safe:",
              ...proofGaps.map((item) => `- ${item}`),
              "",
              "Recommended verification:",
              "- npm run build",
              "- Manual check of affected UX/API flow",
              "- Re-run runtrim finish to capture proof",
            ].join("\n")
          : [
              "No explicit proof gaps are recorded on your latest run.",
              "",
              "Recommended final check:",
              "- npm run build",
              "- One manual smoke test of touched flows",
            ].join("\n"),
        actions: [
          "Review latest run report for proof details",
          "runtrim finish",
        ],
      };
    }
    case "safe_contract":
      return buildContractSuggestion(originalMessage);
    case "handoff":
      return buildHandoff(context);
    case "risk": {
      const topRisks = [...new Set([...(latest.detected_risks ?? []), ...(latest.sensitive_areas ?? [])])].slice(0, 8);
      return {
        answer: [
          "Highest risk areas from your recent context:",
          ...(topRisks.length ? topRisks.map((item) => `- ${item}`) : ["- No explicit risk labels captured in the latest run"]),
          "",
          "Why these are risky:",
          "- They often affect auth, billing, webhooks, or production-critical behavior",
          "- They usually require stricter proof before merge",
          "",
          "Recommendation: use narrow allowed scope and explicit stop rules on the next run.",
        ].join("\n"),
        actions: [
          "runtrim go \"audit-only task in risky area\"",
        ],
      };
    }
    case "savings": {
      return {
        answer: [
          "Estimated savings from recent synced runs:",
          `- Estimated tokens saved: ${context.estimatedTokensSaved.toLocaleString()}`,
          `- Estimated cost saved: $${context.estimatedCostSaved.toFixed(2)}`,
          "",
          "These values are estimates based on captured run metrics.",
        ].join("\n"),
        actions: [
          "Open /app/runs to inspect savings per run",
        ],
      };
    }
    case "scope": {
      const allowed = latest.allowed_scope ?? [];
      const forbidden = latest.forbidden_scope ?? [];
      const stopRules = latest.stop_conditions ?? [];
      return {
        answer: [
          "Latest run scope check:",
          `- Allowed entries: ${allowed.length}`,
          `- Forbidden entries: ${forbidden.length}`,
          `- Stop rules: ${stopRules.length}`,
          `- Changed files recorded: ${changedFiles.length}`,
          "",
          changedFiles.length
            ? "Review each changed file against allowed/forbidden scope in the run report before proceeding."
            : "No changed files recorded on the latest run.",
        ].join("\n"),
        actions: [
          "Open latest run report to validate scope adherence",
        ],
      };
    }
    default: {
      return {
        answer: [
          "Project summary from your current synced context:",
          `- Plan: ${context.plan}`,
          `- Recent runs: ${context.runCount}`,
          `- Latest task: ${latest.task ?? "Untitled run"}`,
          `- Latest risk: ${latestRisk}`,
          `- Latest proof gaps: ${proofGaps.length}`,
          "",
          "I can generate a safe contract suggestion or a Claude/Codex handoff next.",
        ].join("\n"),
        actions: [
          "Ask: Create a safe contract for <task>",
          "Ask: Create a Claude handoff",
        ],
      };
    }
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
    lowerMessage.includes("cancel subscription") ||
    lowerMessage.includes("bypass guard")
  ) {
    return NextResponse.json({
      ok: true,
      answer:
        "I can prepare a safe contract or handoff. To execute, use RunTrim CLI or your coding agent with the generated handoff.",
      actions: [
        "Ask: Create a safe contract for <task>",
        "Ask: Create a Claude handoff",
      ],
      contextUsed: {
        intent: "safety_redirect",
      },
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
