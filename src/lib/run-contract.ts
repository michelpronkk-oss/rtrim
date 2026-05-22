import type { AuditResult, WasteRisk, ProjectContext } from "./run-audit";
import type { RunTrimConfig } from "./runtrim-config";
import { buildCategoryScope } from "./run-compiler";

export interface RunContract {
  objective: string;
  cleanedObjective: string;
  mode: string;
  relevantScope: string[];
  sensitiveScope: string[];
  forbiddenScope: string[];
  inspectionOrder: string[];
  stopRules: string[];
  successCriteria: string[];
  requiredOutputFormat: string[];
  tokenSavingRules: string[];
  whenToAsk: string[];
}

export interface SplitReport {
  detectedSystems: string[];
  blockedReasons: string[];
  recommendedSplit: string[];
  nextSafePrompt: string;
  estimatedWasteAvoided: string;
}

export interface ContractResult {
  contract: RunContract;
  contractText: string;
  promptScoreAfter: number;
  wasteRiskAfter: WasteRisk;
  riskReductionPercent: number;
  estimatedTokensTrimmed: string;
  estimatedDollarsTrimmed: string;
  /** True when the task was classified as a mega-run and blocked. */
  isBlocked: boolean;
  splitReport?: SplitReport;
  scopeResolution?: {
    explicitAllowed: string[];
    explicitForbidden: string[];
    category: string;
    heuristicAllowed: string[];
    finalAllowed: string[];
    finalForbidden: string[];
  };
}

const COST_PER_MILLION: Record<string, number> = {
  opus: 15,
  sonnet: 3,
  haiku: 0.25,
  "gpt-4o": 5,
  "gpt-4o-mini": 0.15,
  o1: 15,
  "o3-mini": 1.1,
};

const BASELINE_WASTED_TOKENS: Record<WasteRisk, number> = {
  critical: 65000,
  high: 35000,
  medium: 15000,
  low: 5000,
};

const GUARDED_BASE_TOKENS = 8000;

function scoreToRisk(score: number): WasteRisk {
  if (score >= 75) return "low";
  if (score >= 55) return "medium";
  if (score >= 35) return "high";
  return "critical";
}

/**
 * Strips waste-inflating phrases and produces a narrower, actionable objective.
 * Examples cleaned:
 *   "check everything" -> removed
 *   "make sure everything works" -> removed
 *   "make sure billing works" -> "verify the billing redirect flow is not broken"
 */
export function cleanObjective(task: string): string {
  let t = task.trim();

  // Remove "check everything [and]" - with optional trailing conjunction
  t = t.replace(/,?\s*check everything(\s+and\b)?/gi, "");
  t = t.replace(/,?\s*(look|search|scan)\s+everywhere(\s+and\b)?/gi, "");
  t = t.replace(/,?\s*review everything(\s+and\b)?/gi, "");

  // Remove "make sure everything works / it all works"
  t = t.replace(/,?\s*make sure (everything|it all) (works?|is working|is fine|is ok|functions?)/gi, "");
  t = t.replace(/,?\s*ensure (everything|it all) (works?|is working|is fine|is ok)/gi, "");

  // Convert "make sure X works" for sensitive areas -> narrower redirect-scoped phrasing
  t = t.replace(
    /,?\s*(make sure|ensure)\s+(the\s+)?(billing|payment|checkout|stripe|order|purchase)\s+(works?|is working|is (fine|ok|correct)|functions?)/gi,
    (_, _verb, _the, area) => {
      const a = area.toLowerCase();
      if (a === "checkout") {
        return ". Verify the checkout redirect path only, without expanding into payment processing, billing state, or webhooks.";
      }
      return `. Verify the ${a} redirect path is not broken at the smallest relevant surface, without expanding into unrelated ${a} state, payment processing, or webhooks.`;
    }
  );

  // Clean up punctuation artifacts
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^[,.\s]+/, "").trim();
  t = t.replace(/[,\s]+$/, "").trim();
  t = t.replace(/\.\s*\./g, ".").trim();

  if (t.length < 8) return task;

  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Build relevant scope using Run Compiler v1.
 *
 * Priority order:
 *   1. Explicit paths mentioned by the user — always win.
 *      "only edit X"           → ONLY those paths, no heuristic additions.
 *      "must include X"        → those paths + category-based hints.
 *      Paths mentioned plainly → those paths + "only files referenced".
 *   2. Task category heuristics — used when no explicit paths were found.
 *      Category drives which directories are included (not always src/app/).
 *   3. Legacy checkout/billing hints — preserved for backward compatibility.
 */
function buildRelevantScope(
  task: string,
  projectContext: ProjectContext,
  config: RunTrimConfig,
  sensitiveAreasRelevant: string[],
  audit: Pick<AuditResult, "explicitPaths" | "onlyMode" | "mustIncludeMode" | "explicitAllowedScope" | "taskCategory" | "explicitForbiddenPaths">
): { finalScope: string[]; heuristicAllowed: string[] } {
  const { explicitPaths, onlyMode, explicitAllowedScope, taskCategory, explicitForbiddenPaths } = audit;
  const scope: string[] = [];
  const heuristicAllowed: string[] = [];
  const forbiddenPathSet = new Set((explicitForbiddenPaths ?? []).map((p) => p.toLowerCase()));
  const pushIfAllowed = (value: string, target: string[]): void => {
    const lower = value.toLowerCase();
    if ([...forbiddenPathSet].some((p) => p && lower.includes(p))) return;
    target.push(value);
  };

  // ── Explicit paths: highest priority ────────────────────────────────────
  const filteredExplicitPaths = explicitPaths.filter((p) => !forbiddenPathSet.has(p.toLowerCase()));
  if (filteredExplicitPaths.length > 0) {
    for (const p of filteredExplicitPaths) {
      scope.push(`${p}${onlyMode ? "  [explicit — user-specified, only this]" : "  [explicit — user-specified]"}`);
    }

    if (onlyMode) {
      // "only edit X" — stop here. No directory-level heuristics.
      scope.push(`Maximum ${config.maxFilesPerRun} files total`);
      return { finalScope: scope, heuristicAllowed };
    }

    // "must include X" or plain explicit reference — add a note but skip broad heuristics
    scope.push("Only files directly referenced by the objective");
    scope.push(`Maximum ${config.maxFilesPerRun} files total`);
    return { finalScope: scope, heuristicAllowed };
  }

  // ── Explicit non-path scope phrases: override heuristics ────────────────
  if (explicitAllowedScope.length > 0) {
    for (const s of explicitAllowedScope) pushIfAllowed(s, scope);
    scope.push("Only files directly referenced by the cleaned objective");
    scope.push(`Maximum ${config.maxFilesPerRun} files total`);
    return { finalScope: [...new Set(scope)], heuristicAllowed };
  }

  // ── No explicit paths — use category-based heuristics ───────────────────
  const categoryScope = buildCategoryScope(
    taskCategory,
    projectContext.hasSrc,
    projectContext.hasApp,
    projectContext.hasPages,
  );

  if (categoryScope.allowedHints.length > 0) {
    for (const hint of categoryScope.allowedHints) {
      if (hint) {
        pushIfAllowed(hint, scope);
        pushIfAllowed(hint, heuristicAllowed);
      }
    }
  } else {
    // Ultimate fallback: directory detection (legacy behavior)
    const taskLower = task.toLowerCase();
    const appRouterIntent =
      taskCategory === "ui" ||
      /\b(homepage|public page|dashboard page|app router|layout|page|src\/app|app\/)/i.test(taskLower);
    if (appRouterIntent) {
      if (projectContext.hasSrc && projectContext.hasApp) {
        pushIfAllowed("src/app/ - App Router pages and layouts only", scope);
        pushIfAllowed("src/app/ - App Router pages and layouts only", heuristicAllowed);
      } else if (projectContext.hasApp) {
        pushIfAllowed("app/ - App Router pages and layouts only", scope);
        pushIfAllowed("app/ - App Router pages and layouts only", heuristicAllowed);
      } else if (projectContext.hasPages) {
        pushIfAllowed("pages/ - Pages Router files only", scope);
        pushIfAllowed("pages/ - Pages Router files only", heuristicAllowed);
      }
    }

    // Legacy checkout/billing hints
    const hasCheckout = sensitiveAreasRelevant.includes("checkout") || /\b(checkout|redirect)\b/i.test(taskLower);
    const hasBilling = sensitiveAreasRelevant.some((a) => ["billing", "payments", "stripe", "dodo"].includes(a)) || /\b(billing|payment)\b/i.test(taskLower);
    if (hasCheckout) {
      pushIfAllowed("Checkout page: src/app/checkout/** or equivalent checkout route", scope);
      pushIfAllowed("Checkout success / redirect handler route", scope);
      pushIfAllowed("Checkout page: src/app/checkout/** or equivalent checkout route", heuristicAllowed);
      pushIfAllowed("Checkout success / redirect handler route", heuristicAllowed);
    }
    if (hasBilling && !hasCheckout) {
      pushIfAllowed("Billing or payment service layer (read-only unless approved)", scope);
      pushIfAllowed("Billing or payment service layer (read-only unless approved)", heuristicAllowed);
    }
    if (hasBilling && hasCheckout) {
      pushIfAllowed("Billing client or payment service: read-only to trace the redirect flow", scope);
      pushIfAllowed("Billing client or payment service: read-only to trace the redirect flow", heuristicAllowed);
    }
  }

  scope.push("Only files directly referenced by the cleaned objective");
  scope.push(`Maximum ${config.maxFilesPerRun} files total`);

  return { finalScope: scope, heuristicAllowed };
}

/**
 * Build sensitive scope for areas that are relevant but require caution.
 * These areas are NOT forbidden - they may be inspected but editing needs approval.
 */
function buildSensitiveScope(sensitiveAreasRelevant: string[]): string[] {
  if (sensitiveAreasRelevant.length === 0) return [];

  const scope: string[] = [];
  const seen = new Set<string>();

  for (const area of sensitiveAreasRelevant) {
    if (seen.has(area)) continue;
    seen.add(area);

    switch (area) {
      case "billing":
        scope.push(
          "Billing service / subscription logic: may inspect. Get explicit approval before editing any billing state, plan IDs, or subscription records."
        );
        break;
      case "checkout":
        scope.push(
          "Checkout page and activation route: may edit redirect-specific code only. Do not touch payment form fields, order creation, subscription state, plan IDs, billing records, payment config, or webhook behavior without explicit approval."
        );
        break;
      case "payments":
        scope.push(
          "Payment client: may inspect to trace the redirect flow. Do not edit payment intent creation, capture, or refund logic without explicit approval."
        );
        break;
      case "stripe":
        scope.push(
          "Stripe client config: may read. Do not edit Stripe keys, webhook secrets, plan/price IDs, or SDK options without explicit approval."
        );
        break;
      case "webhooks":
        scope.push(
          "Webhook handlers: may read to understand the event flow. Do not edit webhook endpoint logic, signature verification, or event routing without explicit approval."
        );
        break;
      case "dodo":
        scope.push(
          "Dodo Payments client: may inspect. Do not edit API keys, webhook config, or payment plan definitions without explicit approval."
        );
        break;
    }
  }

  return scope;
}

/**
 * Build forbidden scope. Only includes always-forbidden areas and sensitive areas
 * NOT already covered by sensitiveScope.
 */
function buildForbiddenScope(
  config: RunTrimConfig,
  sensitiveAreasRelevant: string[],
  explicitForbiddenScope: string[] = []
): string[] {
  const scope: string[] = [];

  // Always forbidden regardless of task
  const alwaysForbidden: Array<[string, string]> = [
    ["auth", "Do not touch auth logic, session handling, or JWT tokens"],
    ["middleware", "Do not modify middleware.ts, proxy.ts, or edge config"],
    ["database", "Do not modify database schema, migrations, or seed files"],
    ["env", "Do not read, write, or reference .env files or secrets"],
  ];

  for (const [area, rule] of alwaysForbidden) {
    if (config.sensitiveAreas.includes(area)) {
      scope.push(rule);
    }
  }

  // Conditionally forbidden: billing/payment/webhooks only when NOT relevant to task
  const conditionallyForbidden: Array<[string, string]> = [
    ["billing", "Do not touch billing or subscription logic unrelated to this task"],
    ["payments", "Do not touch payment processing, Stripe config, or webhook handlers"],
    ["webhooks", "Do not touch webhook endpoints or event handler logic"],
  ];

  for (const [area, rule] of conditionallyForbidden) {
    if (
      config.sensitiveAreas.includes(area) &&
      !sensitiveAreasRelevant.some((r) =>
        ["billing", "payments", "stripe", "checkout", "webhooks", "dodo"].includes(r)
      )
    ) {
      scope.push(rule);
    }
  }

  scope.push("Do not install new dependencies without explicit approval");
  scope.push("Do not refactor code outside the direct task scope");
  scope.push("Do not add console.log statements or debug artifacts");

  return [...scope, ...explicitForbiddenScope.filter(Boolean)];
}

const SYSTEM_LABELS: Record<string, string> = {
  auth: "auth flow",
  middleware: "middleware behavior",
  database: "database schema impact",
  billing: "billing or subscription flow",
  payments: "payment processing surface",
  webhooks: "webhook event handling",
  env: "environment config and secrets",
};

const BLOCKED_REASONS: Record<string, string> = {
  auth: "auth changes without dedicated scope cause session or security regressions",
  middleware: "middleware edits affect every request and must be isolated",
  database: "schema changes require migration review before any other edit",
  billing: "billing logic requires dedicated verification before touching adjacent code",
  payments: "payment processing changes need isolated review and approval",
  webhooks: "webhook handlers must not be edited as a side effect of another task",
  env: "env and secrets must never be read or written without explicit scope",
};

function buildSplitReasons(systems: string[], flags: import("./run-audit").AuditFlag[]): string[] {
  const reasons: string[] = [];
  const hasScan = flags.some((f) => f.code === "likely_full_repo_scan" || f.code === "check_everything_language");
  const hasRewrite = flags.some((f) => f.code === "asks_for_big_rewrite");
  const hasBroad = flags.some((f) => f.code === "scope_too_broad");

  if (hasScan || systems.length >= 3) reasons.push("likely full-repo scan across multiple systems");
  if (systems.length >= 2) reasons.push("likely scope drift between separate high-risk areas");
  if (hasRewrite) reasons.push("unsafe rewrite or restructure language detected");
  if (hasBroad) reasons.push("scope is too broad for a single agent run");
  reasons.push("forbidden areas explicitly requested in the same prompt");
  if (systems.length >= 4) reasons.push("4+ high-risk systems in one run is never safe");

  return reasons;
}

function buildNextSafePrompt(systems: string[]): string {
  const first = systems[0];
  const rest = systems.slice(1);
  const chosen = SYSTEM_LABELS[first] ?? first;
  const forbidden = rest.map((s) => SYSTEM_LABELS[s] ?? s).join(", ");

  return (
    `Audit only. Identify the smallest failing surface related to ${chosen}. ` +
    `Do not edit any files. ` +
    (forbidden
      ? `Do not touch ${forbidden}. `
      : "") +
    `Return the exact files that need inspection and stop.`
  );
}

function generateSplitReport(
  audit: import("./run-audit").AuditResult,
  config: RunTrimConfig
): SplitReport {
  const { megaRunSystems, flags } = audit;

  const detectedSystems = megaRunSystems;
  const blockedReasons = buildSplitReasons(megaRunSystems, flags);

  const recommendedSplit = megaRunSystems.map((system, i) => {
    const label = SYSTEM_LABELS[system] ?? system;
    const reason = BLOCKED_REASONS[system];
    return `${i + 1}. Audit ${label} only. No edits.${reason ? "  (Reason: " + reason + ")" : ""}`;
  });

  const nextSafePrompt = buildNextSafePrompt(megaRunSystems);

  // Estimate waste avoided by NOT running this as a single agent run.
  const costPerM = { opus: 15, sonnet: 3, haiku: 0.25, "gpt-4o": 5, "gpt-4o-mini": 0.15, o1: 15, "o3-mini": 1.1 }[config.defaultModel] ?? 3;
  const estimatedWastedTokens = 80000 + megaRunSystems.length * 15000;
  const dollars = (estimatedWastedTokens / 1_000_000) * costPerM;
  const estimatedWasteAvoided = `~${estimatedWastedTokens.toLocaleString("en-US")} tokens / ~$${dollars.toFixed(2)} (estimated)`;

  return { detectedSystems, blockedReasons, recommendedSplit, nextSafePrompt, estimatedWasteAvoided };
}

export function generateContract(
  task: string,
  audit: AuditResult,
  config: RunTrimConfig
): ContractResult {
  // Blocked path - mega-run: skip normal contract generation entirely.
  if (audit.isMegaRun) {
    const splitReport = generateSplitReport(audit, config);

    const placeholderContract: RunContract = {
      objective: task,
      cleanedObjective: task,
      mode: "blocked",
      relevantScope: [],
      sensitiveScope: [],
      forbiddenScope: [],
      inspectionOrder: [],
      stopRules: [],
      successCriteria: [],
      requiredOutputFormat: [],
      tokenSavingRules: [],
      whenToAsk: [],
    };

    const contractText = [
      "RUNTRIM SPLIT REQUIRED",
      "",
      "This task crosses too many high-risk systems for one AI run.",
      "",
      "Detected systems:",
      ...splitReport.detectedSystems.map((s) => `- ${s}`),
      "",
      "Why blocked:",
      ...splitReport.blockedReasons.map((r) => `- ${r}`),
      "",
      "Recommended split:",
      ...splitReport.recommendedSplit,
      "",
      "Next safe prompt:",
      `"${splitReport.nextSafePrompt}"`,
      "",
      `Estimated waste avoided by splitting: ${splitReport.estimatedWasteAvoided}`,
    ].join("\n");

    return {
      contract: placeholderContract,
      contractText,
      promptScoreAfter: audit.promptScoreBefore,
      wasteRiskAfter: "critical",
      riskReductionPercent: 0,
      estimatedTokensTrimmed: "0",
      estimatedDollarsTrimmed: "$0.00",
      isBlocked: true,
      splitReport,
    };
  }

  const { projectContext, sensitiveAreasRelevant, flags } = audit;
  const hasCriticalFlags = flags.some((f) => f.severity === "critical");

  const cleanedObjective = cleanObjective(task);

  // Pass compiler results to scope builder — explicit paths always win
  const relevantResolved = buildRelevantScope(
    task,
    projectContext,
    config,
    sensitiveAreasRelevant,
    {
      explicitPaths: audit.explicitPaths ?? [],
      onlyMode: audit.onlyMode ?? false,
      mustIncludeMode: audit.mustIncludeMode ?? false,
      explicitAllowedScope: audit.explicitAllowedScope ?? [],
      taskCategory: audit.taskCategory ?? "unknown",
      explicitForbiddenPaths: audit.explicitForbiddenPaths ?? [],
    }
  );
  const relevantScope = relevantResolved.finalScope;
  const sensitiveScope = buildSensitiveScope(sensitiveAreasRelevant);

  // Merge category-specific forbidden additions with the base forbidden scope
  const baseForbiddenScope = buildForbiddenScope(
    config,
    sensitiveAreasRelevant,
    audit.explicitForbiddenScope ?? []
  );
  const categoryDetails = buildCategoryScope(
    audit.taskCategory ?? "unknown",
    projectContext.hasSrc,
    projectContext.hasApp,
    projectContext.hasPages,
  );
  const seenForbidden = new Set(baseForbiddenScope);
  const forbiddenScope = [
    ...baseForbiddenScope,
    ...categoryDetails.forbiddenAdditions.filter((r) => !seenForbidden.has(r)),
  ];

  const inspectionOrder: string[] = [
    "1. Read the cleaned objective once. Do not start coding.",
    "2. List only the files that are directly relevant.",
    "3. State that list before opening any file.",
    "4. Read only the relevant sections of those files.",
    "5. For sensitive scope: read first, state what you found, ask before editing.",
    "6. Identify root cause before proposing any solution.",
    "7. Propose the minimal change. Wait if scope expands.",
  ];

  // Base stop rules + category-specific additions (deduplicated)
  const baseStopRules: string[] = [
    `Stop if the change requires touching more than ${config.maxFilesPerRun} files.`,
    "Stop if you need to modify any file in the forbidden scope.",
    "Stop before editing any sensitive scope item without explicit approval.",
    "Stop if you cannot identify a clear root cause.",
    "Stop if the fix requires installing new packages.",
    "Stop if you find yourself reading files not in the relevant or sensitive scope.",
  ];
  const seenStop = new Set(baseStopRules);
  const stopRules = [
    ...baseStopRules,
    ...categoryDetails.stopRules.filter((r) => !seenStop.has(r)),
  ];

  const successCriteria: string[] = [
    "The specific behavior described in the cleaned objective is fixed or implemented.",
    "No regressions in adjacent functionality.",
    "Changes are strictly within the relevant scope.",
    "Output includes the exact list of files changed.",
    ...(sensitiveAreasRelevant.length > 0
      ? ["Sensitive scope items were read only and not edited without noted approval."]
      : []),
  ];

  const requiredOutputFormat: string[] = [
    "FILES CHANGED: [list each modified file, one per line]",
    "ROOT CAUSE: [one sentence]",
    "WHAT CHANGED: [bullet list, no prose]",
    "HOW TO VERIFY: [exact steps to confirm the fix works]",
    "NEXT SAFE ACTION: [one specific next step, or 'done']",
  ];

  const tokenSavingRules: string[] = [
    "Do not repeat the task back.",
    "Do not explain what each file does unless directly relevant.",
    "Do not show unchanged code blocks.",
    "Do not add explanatory comments to the code.",
    "Do not suggest follow-up improvements outside this task.",
    "Do not summarize what you are about to do before doing it.",
  ];

  const whenToAsk: string[] = [
    "Ask before editing any item in the sensitive scope.",
    "Ask before touching any file in the forbidden scope.",
    "Ask if the root cause is ambiguous between two separate issues.",
    `Ask if you need to read more than ${config.maxFilesPerRun} files to proceed.`,
    "Ask if the fix requires a breaking change to an existing API or type.",
    "Ask before adding any new dependency.",
  ];

  const mode = hasCriticalFlags ? "guarded-strict" : "guarded-standard";

  const contract: RunContract = {
    objective: task,
    cleanedObjective,
    mode,
    relevantScope,
    sensitiveScope,
    forbiddenScope,
    inspectionOrder,
    stopRules,
    successCriteria,
    requiredOutputFormat,
    tokenSavingRules,
    whenToAsk,
  };

  const contractText = formatContractText(contract, config, audit);

  const promptScoreAfter = Math.min(93, audit.promptScoreBefore + 45);
  const wasteRiskAfter = scoreToRisk(promptScoreAfter);

  const rawReduction =
    ((promptScoreAfter - audit.promptScoreBefore) /
      Math.max(1, 100 - audit.promptScoreBefore)) *
    100;
  const riskReductionPercent = Math.max(0, Math.round(rawReduction));

  const baseline = BASELINE_WASTED_TOKENS[audit.wasteRiskBefore];
  const trimmedTokens = Math.max(0, baseline - GUARDED_BASE_TOKENS);
  const costPerM = COST_PER_MILLION[config.defaultModel] ?? 3;
  const estimatedDollars = (trimmedTokens / 1_000_000) * costPerM;

  return {
    contract,
    contractText,
    promptScoreAfter,
    wasteRiskAfter,
    riskReductionPercent,
    estimatedTokensTrimmed: trimmedTokens.toLocaleString("en-US"),
    estimatedDollarsTrimmed:
      estimatedDollars < 0.01 ? "<$0.01" : `$${estimatedDollars.toFixed(2)}`,
    isBlocked: false,
    scopeResolution: {
      explicitAllowed: [...(audit.explicitPaths ?? []), ...(audit.explicitAllowedScope ?? [])],
      explicitForbidden: [...(audit.explicitForbiddenScope ?? []), ...(audit.explicitForbiddenPaths ?? [])],
      category: audit.taskCategory ?? "unknown",
      heuristicAllowed: relevantResolved.heuristicAllowed,
      finalAllowed: relevantScope,
      finalForbidden: forbiddenScope,
    },
  };
}

function formatContractText(contract: RunContract, config: RunTrimConfig, audit?: Partial<AuditResult>): string {
  const category = audit?.taskCategory ?? "unknown";
  const hasExplicitPaths = (audit?.explicitPaths?.length ?? 0) > 0;

  const lines: string[] = [
    "RUNTRIM GUARDED RUN CONTRACT",
    `Mode: ${contract.mode.toUpperCase()}`,
    `Category: ${category}`,
    "Agent: Claude, Codex, Cursor, ChatGPT, or configured agent",
    "",
    "OBJECTIVE",
    contract.objective !== contract.cleanedObjective
      ? `User task: ${contract.objective}\nCompiled: ${contract.cleanedObjective}`
      : contract.cleanedObjective,
    "",
    hasExplicitPaths
      ? "ALLOWED SCOPE  [explicit paths have highest priority — do not substitute with broader directories]"
      : "ALLOWED SCOPE",
    ...contract.relevantScope.map((s) => `- ${s}`),
  ];

  if (contract.sensitiveScope.length > 0) {
    lines.push(
      "",
      "SENSITIVE SCOPE (inspect allowed, approval required before editing)",
      ...contract.sensitiveScope.map((s) => `- ${s}`)
    );
  }

  const verificationSteps = audit?.taskCategory
    ? buildCategoryScope(
        audit.taskCategory,
        false, false, false,
      ).verificationSteps
    : [];

  lines.push(
    "",
    "FORBIDDEN SCOPE",
    ...contract.forbiddenScope.map((s) => `- ${s}`),
    "",
    "INSPECTION ORDER",
    ...contract.inspectionOrder,
    "",
    "STOP RULES",
    ...contract.stopRules.map((s) => `- ${s}`),
    "",
    "SUCCESS CRITERIA",
    ...contract.successCriteria.map((s) => `- ${s}`),
  );

  if (verificationSteps.length > 0) {
    lines.push(
      "",
      "VERIFICATION STEPS",
      ...verificationSteps.map((s) => `- ${s}`),
    );
  }

  lines.push(
    "",
    "REQUIRED OUTPUT FORMAT",
    ...contract.requiredOutputFormat.map((s) => `- ${s}`),
    "",
    "TOKEN-SAVING RULES",
    ...contract.tokenSavingRules.map((s) => `- ${s}`),
    "",
    "WHEN TO ASK BEFORE CONTINUING",
    ...contract.whenToAsk.map((s) => `- ${s}`)
  );

  return lines.join("\n");
}


