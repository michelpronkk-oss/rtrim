import fs from "fs";
import path from "path";
import type { RunTrimConfig } from "./runtrim-config";
import { compileTask, type TaskCategory } from "./run-compiler";

export type WasteRisk = "low" | "medium" | "high" | "critical";

export interface AuditFlag {
  code: string;
  label: string;
  severity: "info" | "warning" | "critical";
  detail: string;
}

export interface ProjectContext {
  framework: string[];
  hasSrc: boolean;
  hasApp: boolean;
  hasPages: boolean;
  hasMiddleware: boolean;
  hasSupabase: boolean;
  hasStripe: boolean;
  hasPrisma: boolean;
  hasEnvFile: boolean;
  detectedSensitiveAreas: string[];
}

export interface AuditResult {
  task: string;
  flags: AuditFlag[];
  promptScoreBefore: number;
  wasteRiskBefore: WasteRisk;
  projectContext: ProjectContext;
  /** Areas that are always-forbidden and explicitly named in the task (auth, env, middleware, database). */
  sensitiveAreasTouched: string[];
  /** Areas that are sensitive but relevant to the task - inspect OK, edit needs approval (billing, payment, checkout, stripe, webhooks). */
  sensitiveAreasRelevant: string[];
  /** True when 3+ high-risk systems are present — should be blocked, not contracted. */
  isMegaRun: boolean;
  /** The high-risk systems that triggered the mega-run classification. */
  megaRunSystems: string[];
  // ── Run Compiler v1 fields ─────────────────────────────────────────────────
  /** File/directory paths explicitly referenced in the task. Always override heuristic scope. */
  explicitPaths: string[];
  /** True when task uses "only edit/touch X" — allowed scope is ONLY those explicit paths. */
  onlyMode: boolean;
  /** True when task uses "allowed scope must include X" — explicit paths are additive. */
  mustIncludeMode: boolean;
  /** Heuristic category: ui, auth, billing, webhook, cli, etc. */
  taskCategory: TaskCategory;
  /** Explicit allowed scope phrases from task text when provided. */
  explicitAllowedScope: string[];
  /** Explicit forbidden scope phrases from task text when provided. */
  explicitForbiddenScope: string[];
  /** Path-like entries extracted from explicit forbidden phrases. */
  explicitForbiddenPaths: string[];
}

// Always forbidden regardless of task content.
const ALWAYS_FORBIDDEN_KEYWORDS: Record<string, string[]> = {
  auth: ["auth", "authentication", "session", "jwt", "login", "logout", "oauth"],
  middleware: ["middleware", "proxy.ts", "edge config"],
  database: ["schema", "migration", "seed", "prisma", "drizzle"],
  env: ["env", ".env", "secret", "api key", "apikey"],
};

// Sensitive when the task explicitly references them — inspect allowed, edit needs approval.
const SENSITIVE_BILLING_KEYWORDS: Record<string, string[]> = {
  billing: ["billing", "subscription", "plan", "invoice"],
  checkout: ["checkout", "cart", "basket"],
  payments: ["payment", "payments", "pay", "purchase"],
  stripe: ["stripe"],
  webhooks: ["webhook", "event handler"],
  dodo: ["dodo", "dodopayments"],
};

// High-risk systems counted toward mega-run threshold (3+ = blocked).
const MEGA_RUN_SYSTEMS: Record<string, string[]> = {
  auth: ["auth", "authentication", "session", "jwt", "login", "logout", "oauth"],
  middleware: ["middleware", "proxy", "edge config", "edge function"],
  database: ["database", "db schema", "schema", "migration", "prisma", "drizzle"],
  billing: ["billing", "subscription", "invoice"],
  payments: ["payment", "stripe", "dodo", "purchase"],
  webhooks: ["webhook"],
  env: [".env", "secret", "api key", "apikey", "env var"],
};

// Patterns that carry the weight of 2 extra systems (unbounded rewrites/refactors).
const MEGA_RUN_AMPLIFIERS = [
  /\b(rewrite|rebuild|refactor|redo|overhaul)\b.{0,40}\b(everything|all|entire|whole|codebase)\b/i,
  /\bmake (everything|it all|all of it)\s*(work|function|correct)/i,
  /\brefactor everything\b/i,
];

const VAGUE_PATTERNS = [
  /\b(fix|check|review|look at|clean up|update|improve|refactor)\b.{0,20}(everything|all|whole|entire|codebase|repo|project)\b/i,
  /^(fix|check|update|improve)\s+\w+\s*$/i,
];

const SCOPE_BROAD_PATTERNS = [
  /\b(entire|whole|all of|everything in|full)\b/i,
  /\b(all (files|components|pages|routes|functions))\b/i,
];

const CHECK_ALL_PATTERNS = [
  /\b(check everything|review all|scan the (whole|entire|full))\b/i,
  /\b(go through (all|every|the whole))\b/i,
  /\b(make sure (everything|it all) works?)\b/i,
];

const REWRITE_PATTERNS = [
  /\b(rewrite|rebuild|redo|restructure|overhaul|revamp)\b/i,
  /\b(from scratch|ground up|completely new)\b/i,
];

const LOOP_PATTERNS = [
  /\b(keep (trying|going|working)|iterate until|loop until|retry)\b/i,
  /\b(if it doesn.t work.{0,20}try again)\b/i,
];

const NEGATION_PREFIX_RE =
  /\b(do not|don't|dont|never|avoid|must not|should not|without changing|without touching|no changes to|keep .* untouched|leave .* untouched|keep .* unchanged)\b/i;

function hasNegationNear(text: string, index: number): boolean {
  const start = Math.max(0, index - 64);
  const window = text.slice(start, index + 8);
  return NEGATION_PREFIX_RE.test(window);
}

function hasPositiveKeywordMention(taskLower: string, keyword: string): boolean {
  let idx = taskLower.indexOf(keyword.toLowerCase());
  while (idx !== -1) {
    if (!hasNegationNear(taskLower, idx)) return true;
    idx = taskLower.indexOf(keyword.toLowerCase(), idx + keyword.length);
  }
  return false;
}

function hasNegatedKeywordMention(taskLower: string, keyword: string): boolean {
  let idx = taskLower.indexOf(keyword.toLowerCase());
  while (idx !== -1) {
    if (hasNegationNear(taskLower, idx)) return true;
    idx = taskLower.indexOf(keyword.toLowerCase(), idx + keyword.length);
  }
  return false;
}

function scoreTask(task: string, flags: AuditFlag[]): number {
  let score = 100;
  for (const flag of flags) {
    if (flag.severity === "critical") score -= 25;
    else if (flag.severity === "warning") score -= 12;
    else score -= 5;
  }
  if (task.includes("only") || task.includes("specifically")) score += 5;
  if (/\b(file|component|function|route|endpoint|page|hook)\b/i.test(task)) score += 5;
  if (task.length > 60 && task.length < 300) score += 5;
  return Math.max(0, Math.min(100, score));
}

function scoreToRisk(score: number): WasteRisk {
  if (score >= 75) return "low";
  if (score >= 55) return "medium";
  if (score >= 35) return "high";
  return "critical";
}

export function detectProjectContext(cwd = process.cwd()): ProjectContext {
  const exists = (p: string) => fs.existsSync(path.join(cwd, p));
  const framework: string[] = [];

  try {
    if (exists("package.json")) {
      const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps["next"]) framework.push("nextjs");
      if (deps["@supabase/supabase-js"]) framework.push("supabase");
      if (deps["stripe"]) framework.push("stripe");
      if (deps["@shopify/shopify-api"] || deps["@shopify/hydrogen"]) framework.push("shopify");
      if (deps["prisma"] || deps["@prisma/client"]) framework.push("prisma");
      if (deps["drizzle-orm"]) framework.push("drizzle");
    }
  } catch {
    // ignore
  }

  const hasMiddleware =
    exists("middleware.ts") ||
    exists("middleware.js") ||
    exists("proxy.ts") ||
    exists("proxy.js");

  const hasSupabase = exists("supabase") || framework.includes("supabase");
  const hasStripe = framework.includes("stripe");
  const hasPrisma = framework.includes("prisma");
  const hasEnvFile = exists(".env") || exists(".env.local") || exists(".env.production");

  const detectedSensitiveAreas: string[] = [];
  if (hasMiddleware) detectedSensitiveAreas.push("middleware");
  if (hasSupabase) detectedSensitiveAreas.push("auth", "database");
  if (hasStripe || hasPrisma) detectedSensitiveAreas.push("billing", "payments");
  if (hasEnvFile) detectedSensitiveAreas.push("env");

  return {
    framework,
    hasSrc: exists("src"),
    hasApp: exists("app") || exists("src/app"),
    hasPages: exists("pages") || exists("src/pages"),
    hasMiddleware,
    hasSupabase,
    hasStripe,
    hasPrisma,
    hasEnvFile,
    detectedSensitiveAreas,
  };
}

function detectMegaRun(taskLower: string, task: string): {
  isMegaRun: boolean;
  megaRunSystems: string[];
} {
  const found: string[] = [];
  for (const [system, keywords] of Object.entries(MEGA_RUN_SYSTEMS)) {
    if (keywords.some((kw) => hasPositiveKeywordMention(taskLower, kw))) {
      found.push(system);
    }
  }
  const amplifierBonus = MEGA_RUN_AMPLIFIERS.some((p) => p.test(task)) ? 2 : 0;
  const effectiveCount = found.length + amplifierBonus;
  return { isMegaRun: effectiveCount >= 3, megaRunSystems: found };
}

function detectAreasTouched(taskLower: string): {
  forbidden: string[];
  sensitive: string[];
  boundaries: string[];
} {
  const forbidden: string[] = [];
  const sensitive: string[] = [];
  const boundaries: string[] = [];

  for (const [area, keywords] of Object.entries(ALWAYS_FORBIDDEN_KEYWORDS)) {
    if (keywords.some((kw) => hasPositiveKeywordMention(taskLower, kw))) {
      forbidden.push(area);
    }
    if (keywords.some((kw) => hasNegatedKeywordMention(taskLower, kw))) {
      boundaries.push(area);
    }
  }

  for (const [area, keywords] of Object.entries(SENSITIVE_BILLING_KEYWORDS)) {
    if (keywords.some((kw) => hasPositiveKeywordMention(taskLower, kw))) {
      sensitive.push(area);
    }
    if (keywords.some((kw) => hasNegatedKeywordMention(taskLower, kw))) {
      boundaries.push(area);
    }
  }

  return { forbidden, sensitive, boundaries: [...new Set(boundaries)] };
}

export function auditTask(
  task: string,
  config: RunTrimConfig,
  cwd = process.cwd()
): AuditResult {
  const flags: AuditFlag[] = [];
  const projectContext = detectProjectContext(cwd);
  const taskLower = task.toLowerCase();

  if (task.trim().split(/\s+/).length < 5 || VAGUE_PATTERNS.some((p) => p.test(task))) {
    flags.push({
      code: "vague_task",
      label: "Vague task description",
      severity: "warning",
      detail:
        "The task is too vague for a scoped agent run. Add a specific file, function, or behavior.",
    });
  }

  if (SCOPE_BROAD_PATTERNS.some((p) => p.test(task))) {
    flags.push({
      code: "scope_too_broad",
      label: "Scope too broad",
      severity: "critical",
      detail:
        "Phrases like 'entire', 'all files', or 'whole codebase' cause full repo scans.",
    });
  }

  if (CHECK_ALL_PATTERNS.some((p) => p.test(task))) {
    flags.push({
      code: "check_everything_language",
      label: "Check-everything language",
      severity: "critical",
      detail:
        "Phrases like 'check everything' or 'make sure everything works' cause full context loads. The contract will neutralize these.",
    });
  }

  if (
    !task.match(
      /\b(should|must|expected|result|goal|so that|until|when|returns|shows)\b/i
    ) &&
    task.length < 150
  ) {
    flags.push({
      code: "missing_success_condition",
      label: "No success condition",
      severity: "warning",
      detail:
        "There is no clear definition of done. The agent may loop or over-deliver.",
    });
  }

  if (!task.match(/\b(only|stop|do not|don.t|avoid|skip|ignore|exclude|limit to)\b/i)) {
    flags.push({
      code: "missing_stop_rules",
      label: "No stop rules",
      severity: "warning",
      detail: "Without stop rules the agent has no boundary on what it can touch.",
    });
  }

  if (!task.match(/\b(do not touch|do not modify|don.t change|leave|keep|preserve|off-limits|forbidden)\b/i)) {
    flags.push({
      code: "missing_forbidden_scope",
      label: "No forbidden scope defined",
      severity: "warning",
      detail:
        "Without explicit forbidden areas the agent may touch unintended files.",
    });
  }

  if (/\b(find all|search for|scan|audit|check for)\b/i.test(task)) {
    flags.push({
      code: "likely_full_repo_scan",
      label: "Likely full repo scan",
      severity: "warning",
      detail: "Search or find instructions often trigger a full repo read.",
    });
  }

  if (REWRITE_PATTERNS.some((p) => p.test(task))) {
    flags.push({
      code: "asks_for_big_rewrite",
      label: "Big rewrite requested",
      severity: "critical",
      detail:
        "Rewrites have unbounded scope and are the highest token-waste pattern.",
    });
  }

  if (LOOP_PATTERNS.some((p) => p.test(task))) {
    flags.push({
      code: "likely_repeated_loop",
      label: "Likely agent loop pattern",
      severity: "warning",
      detail:
        "Retry or iterate-until instructions can cause expensive agent loops.",
    });
  }

  if (
    /\b(entire context|full context|all context|everything above|whole conversation)\b/i.test(
      task
    )
  ) {
    flags.push({
      code: "likely_context_bloat",
      label: "Context bloat risk",
      severity: "warning",
      detail:
        "References to full context or entire conversation force expensive context loading.",
    });
  }

  // Detect areas by category
  const { forbidden: forbiddenAreasTouched, sensitive: sensitiveAreasRelevant, boundaries } =
    detectAreasTouched(taskLower);

  // Flag forbidden areas explicitly mentioned in the task (e.g. "touch auth")
  if (forbiddenAreasTouched.length > 0) {
    flags.push({
      code: "touches_forbidden_area",
      label: `Mentions forbidden area: ${forbiddenAreasTouched.join(", ")}`,
      severity: "critical",
      detail: `Task references ${forbiddenAreasTouched.join(", ")}, which is always in forbidden scope. The contract will enforce strict guards.`,
    });
  }

  // Flag sensitive billing/payment areas - warning, not critical
  if (sensitiveAreasRelevant.length > 0) {
    flags.push({
      code: "sensitive_billing_area",
      label: `Sensitive area: ${sensitiveAreasRelevant.join(", ")}`,
      severity: "warning",
      detail: `Task touches ${sensitiveAreasRelevant.join(", ")}. These are moved to SENSITIVE SCOPE: inspect allowed, editing requires explicit approval.`,
    });
  }

  if (boundaries.length > 0) {
    flags.push({
      code: "forbidden_boundaries_detected",
      label: `Boundaries detected: ${boundaries.join(", ")}`,
      severity: "info",
      detail:
        "Sensitive systems in negated constraints are treated as forbidden boundaries, not active task scope.",
    });
  }

  const isSimpleTask =
    task.length < 80 && flags.filter((f) => f.severity === "critical").length === 0;
  if (isSimpleTask && config.defaultModel === "opus") {
    flags.push({
      code: "expensive_model_mismatch",
      label: "Expensive model for simple task",
      severity: "warning",
      detail:
        "Opus-class models cost 5-15x more than Sonnet. Most coding tasks do not require Opus.",
    });
  }

  if (
    config.auditFirst &&
    !task.match(
      /\b(audit|plan|outline|list files|before (you|coding|writing)|don.t (start|write|code) until)\b/i
    )
  ) {
    flags.push({
      code: "no_audit_first_instruction",
      label: "No audit-first instruction",
      severity: "info",
      detail:
        "Without explicit audit-first instructions, agents often start coding without checking scope.",
    });
  }

  // Mega-run check — must run after all other flags so the flag list is complete.
  const { isMegaRun, megaRunSystems } = detectMegaRun(taskLower, task);

  if (isMegaRun) {
    flags.push({
      code: "blocked_mega_run",
      label: `Mega-run blocked: ${megaRunSystems.join(", ")}`,
      severity: "critical",
      detail: `Task spans ${megaRunSystems.length} high-risk systems. Executing this in one agent run would likely cause full-repo scans, scope drift, and unsafe edits across forbidden areas. Split required.`,
    });
  }

  const promptScoreBefore = scoreTask(task, flags);
  const wasteRiskBefore = scoreToRisk(promptScoreBefore);

  // ── Run Compiler v1: extract explicit paths and classify task ─────────────
  const compiler = compileTask(task);

  // Boost score when user provides explicit paths (narrows scope meaningfully)
  const adjustedScore = compiler.explicitPaths.length > 0
    ? Math.min(100, promptScoreBefore + (compiler.onlyMode ? 20 : 10))
    : promptScoreBefore;

  return {
    task,
    flags,
    promptScoreBefore: adjustedScore,
    wasteRiskBefore: scoreToRisk(adjustedScore),
    projectContext,
    sensitiveAreasTouched: forbiddenAreasTouched,
    sensitiveAreasRelevant,
    isMegaRun,
    megaRunSystems,
    explicitPaths: compiler.explicitPaths,
    onlyMode: compiler.onlyMode,
    mustIncludeMode: compiler.mustIncludeMode,
    taskCategory: compiler.taskCategory,
    explicitAllowedScope: compiler.explicitAllowedScope,
    explicitForbiddenScope: compiler.explicitForbiddenScope,
    explicitForbiddenPaths: compiler.explicitForbiddenPaths,
  };
}
