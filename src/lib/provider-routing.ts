export type ProviderRoute =
  | "fast-local"
  | "balanced-coding"
  | "high-reasoning"
  | "preview-only"
  | "split-required";

export type RecommendedAgent =
  | "cursor-inline"
  | "generic-agent"
  | "claude-code"
  | "codex"
  | "manual-review"
  | "split-first";

export type ModelTier = "fast" | "balanced" | "premium-reasoning" | "manual-review";
export type ExecutionMode =
  | "fast-path"
  | "contract-recommended"
  | "preview-first"
  | "confirmed-apply-only"
  | "split-first"
  | "read-only-answer";

export interface ProviderRoutingDecision {
  route: ProviderRoute;
  recommendedAgent: RecommendedAgent;
  modelTier: ModelTier;
  executionMode: ExecutionMode;
  approvalRequired: boolean;
  confidence: "low" | "medium" | "high";
  routingReason: string;
  warnings: string[];
  nextCommand: string;
}

export interface ProviderRoutingContext {
  task: string;
  category?: string;
  risk?: "low" | "medium" | "high" | "critical";
  guardMode?: string;
  allowedScope?: string[];
  forbiddenScope?: string[];
  proofRequired?: string[];
  sensitiveAreas?: string[];
  changedFiles?: string[];
  similarRunsCount?: number;
  learnedContext?: string[];
  explicitScope?: boolean;
  splitRequired?: boolean;
}

const HIGH_RISK_KEYWORDS = [
  "auth",
  "billing",
  "payment",
  "dodo",
  "stripe",
  "webhook",
  "subscription",
  "database",
  "migration",
  "rls",
  "middleware",
  "secret",
  "env",
];

const FAST_LOCAL_KEYWORDS = [
  "copy",
  "docs",
  "readme",
  "spacing",
  "style",
  "styling",
  "text",
  "label",
  "badge",
  "mobile",
  "responsive",
  "ui polish",
];

const NEGATION_PREFIX_RE =
  /\b(do not|don't|dont|never|avoid|must not|should not|without changing|without touching|no changes to|keep .* untouched|leave .* untouched|keep .* unchanged)\b/i;

function hasNegationNear(text: string, index: number): boolean {
  const start = Math.max(0, index - 64);
  const window = text.slice(start, index + 8);
  return NEGATION_PREFIX_RE.test(window);
}

function hasPositiveKeywordMention(task: string, keyword: string): boolean {
  const lowerTask = task.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let idx = lowerTask.indexOf(lowerKeyword);
  while (idx !== -1) {
    if (!hasNegationNear(lowerTask, idx)) return true;
    idx = lowerTask.indexOf(lowerKeyword, idx + lowerKeyword.length);
  }
  return false;
}

function normalize(s: string | undefined): string {
  return (s ?? "").toLowerCase();
}

function pickDefaults(route: ProviderRoute): Omit<ProviderRoutingDecision, "routingReason" | "warnings" | "confidence" | "nextCommand"> {
  switch (route) {
    case "fast-local":
      return {
        route,
        recommendedAgent: "cursor-inline",
        modelTier: "fast",
        executionMode: "fast-path",
        approvalRequired: false,
      };
    case "balanced-coding":
      return {
        route,
        recommendedAgent: "codex",
        modelTier: "balanced",
        executionMode: "contract-recommended",
        approvalRequired: false,
      };
    case "high-reasoning":
      return {
        route,
        recommendedAgent: "claude-code",
        modelTier: "premium-reasoning",
        executionMode: "confirmed-apply-only",
        approvalRequired: true,
      };
    case "preview-only":
      return {
        route,
        recommendedAgent: "manual-review",
        modelTier: "manual-review",
        executionMode: "preview-first",
        approvalRequired: true,
      };
    case "split-required":
      return {
        route,
        recommendedAgent: "split-first",
        modelTier: "manual-review",
        executionMode: "split-first",
        approvalRequired: true,
      };
  }
}

export function recommendProviderRouting(ctx: ProviderRoutingContext): ProviderRoutingDecision {
  const task = normalize(ctx.task);
  const category = normalize(ctx.category);
  const risk = ctx.risk ?? "low";
  const warnings: string[] = [];
  const proofRequired = ctx.proofRequired ?? [];
  const sensitiveAreas = ctx.sensitiveAreas ?? [];
  const changedFiles = ctx.changedFiles ?? [];
  const learnedContext = ctx.learnedContext ?? [];
  const hasProofGapSignals = proofRequired.some((p) => /proof gap|missing|vercel log|manual verification/i.test(p));
  const highRiskByKeyword = HIGH_RISK_KEYWORDS.some((k) => hasPositiveKeywordMention(task, k) || hasPositiveKeywordMention(category, k));
  const fastKeyword = FAST_LOCAL_KEYWORDS.some((k) => task.includes(k));
  const multiCritical =
    ["auth", "billing", "database", "webhook", "payment", "migration"].filter((k) => hasPositiveKeywordMention(task, k)).length >= 2;
  const broadTask = !ctx.explicitScope && task.split(/\s+/).length > 16;
  const hasSensitiveFiles = sensitiveAreas.length > 0 || changedFiles.some((f) => HIGH_RISK_KEYWORDS.some((k) => normalize(f).includes(k)));
  const noLearning = learnedContext.length === 0 && (ctx.similarRunsCount ?? 0) === 0;

  let route: ProviderRoute = "balanced-coding";

  if (ctx.splitRequired || multiCritical) {
    route = "split-required";
    warnings.push("This task crosses multiple critical systems.");
  } else if (risk === "high" || risk === "critical" || highRiskByKeyword) {
    route = "high-reasoning";
    warnings.push("Critical systems detected. Use preview-first with proof requirements.");
  } else if (broadTask || (hasProofGapSignals && !ctx.explicitScope)) {
    route = "preview-only";
    warnings.push("Scope is broad or unclear. Narrow before apply.");
  } else if ((risk === "low" && fastKeyword) || (risk === "low" && category === "ui")) {
    route = "fast-local";
  } else {
    route = "balanced-coding";
  }

  const base = pickDefaults(route);

  let confidence: "low" | "medium" | "high" = "medium";
  if (ctx.explicitScope && !broadTask) confidence = "high";
  if (route === "preview-only" || route === "split-required") confidence = "low";
  if (noLearning && confidence === "high") confidence = "medium";

  if (hasSensitiveFiles && route === "fast-local") {
    route = "balanced-coding";
    warnings.push("Sensitive paths were detected. Fast route was downgraded.");
  }

  let routingReason = "Scoped implementation task with standard risk profile.";
  if (route === "fast-local") {
    routingReason = "This looks like isolated UI/copy polish, so fast-local is safe if forbidden systems stay untouched.";
  } else if (route === "balanced-coding") {
    routingReason = "This is a normal coding task with moderate complexity, so balanced-coding is recommended.";
  } else if (route === "high-reasoning") {
    routingReason = "This touches high-risk systems, so RunTrim should use high-reasoning with preview first and proof requirements.";
  } else if (route === "preview-only") {
    routingReason = "Scope is too broad or unclear for apply. Generate preview first and narrow the task.";
  } else if (route === "split-required") {
    routingReason = "This spans multiple critical systems, so RunTrim should split into audit, implementation, and verification.";
  }

  let nextCommand = `runtrim go "${ctx.task}"`;
  if (route === "split-required") {
    nextCommand = 'split into:\n1. audit only\n2. implementation only\n3. verification only';
  } else if (route === "preview-only") {
    nextCommand = `runtrim agent "${ctx.task}" --preview`;
  } else if (base.approvalRequired) {
    nextCommand = `runtrim agent "${ctx.task}" --execute --confirm`;
  }

  return {
    ...pickDefaults(route),
    confidence,
    routingReason,
    warnings,
    nextCommand,
  };
}
