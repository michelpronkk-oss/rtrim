export type PlanId = "free" | "pro" | "builder" | "team";

export type PlanFeature =
  | "cloudSync"
  | "cloudHistory"
  | "shareCards"
  | "weeklyReport"
  | "multiProject"
  | "advancedCheck"
  | "customRules"
  | "modelRecommendations"
  | "teamPolicies"
  | "githubSummaries"
  | "exportableReports"
  | "agentEarlyAccess";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  summary: string;
  ctaLabel: string;
  badge?: string;
  features: PlanFeature[];
  bullets: string[];
}

export const planOrder: PlanId[] = ["free", "pro", "builder", "team"];

export const plans: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    summary: "Local control for individual AI coding runs.",
    ctaLabel: "Install CLI",
    features: [],
    bullets: [
      "Local guarded runs",
      "Project setup and agent instructions",
      "Scope, memory and finish checks",
      "Local restore for latest guarded run (preview/apply in CLI)",
      "Sensitive file warnings",
      "Local run history only",
      "Basic MCP config snippets",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$29/month",
    summary: "Personal agent control with synced memory and cloud history.",
    ctaLabel: "Start Pro trial",
    features: ["cloudSync", "cloudHistory", "shareCards", "weeklyReport", "agentEarlyAccess"],
    bullets: [
      "Everything in Free",
      "Auto-sync dashboard",
      "Cloud run history",
      "Synced restore metadata and recovery visibility",
      "Memory sync across machines",
      "Synced reports and savings history",
      "3-day trial",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    priceLabel: "$49/month",
    summary: "For founders shipping production code with AI agents daily.",
    ctaLabel: "Get Builder",
    badge: "Founder plan",
    features: [
      "cloudSync",
      "cloudHistory",
      "shareCards",
      "weeklyReport",
      "multiProject",
      "advancedCheck",
      "customRules",
      "modelRecommendations",
      "exportableReports",
      "agentEarlyAccess",
    ],
    bullets: [
      "Everything in Pro",
      "Unlimited projects",
      "Multi-project restore history and recovery direction",
      "Advanced reports",
      "Priority guardrails and Run Compiler access",
      "Multi-project memory",
      "Early access integrations",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "from $24/seat",
    summary: "Shared control for teams using AI coding agents.",
    ctaLabel: "Join waitlist",
    features: [
      "cloudSync",
      "cloudHistory",
      "shareCards",
      "weeklyReport",
      "multiProject",
      "advancedCheck",
      "customRules",
      "modelRecommendations",
      "exportableReports",
      "teamPolicies",
      "githubSummaries",
      "agentEarlyAccess",
    ],
    bullets: [
      "Everything in Builder",
      "Shared team state and shared memory",
      "Team approvals",
      "Shared run history",
      "Shared restore logs and audit-ready recovery direction",
      "Audit logs",
      "Team policies and GitHub checks (coming soon)",
    ],
  },
};

export function getPlan(planId: PlanId): Plan {
  return plans[planId];
}

export function hasFeature(planId: PlanId, featureName: PlanFeature): boolean {
  return plans[planId].features.includes(featureName);
}
