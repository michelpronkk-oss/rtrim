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
    priceLabel: "$0 / local",
    summary: "Local control for individual AI coding runs.",
    ctaLabel: "Install free CLI",
    features: [],
    bullets: [
      "Unlimited local runs",
      "Memory, scope and finish checks",
      "All supported agents",
      "Local run history",
      "Local restore for latest run",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$29 / month",
    summary: "Personal agent control with synced memory, cloud history and recovery metadata.",
    ctaLabel: "Start 3-day Pro trial",
    badge: "Recommended",
    features: ["cloudSync", "cloudHistory", "shareCards", "weeklyReport", "agentEarlyAccess"],
    bullets: [
      "Everything in Free",
      "Auto-sync dashboard",
      "Cloud run history",
      "Memory sync",
      "Synced restore metadata",
      "Savings and history reports",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    priceLabel: "$49 / month",
    summary: "Advanced guardrails for founders shipping production code with AI agents daily.",
    ctaLabel: "Get Builder",
    badge: "Serious projects",
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
      "Proof and drift reports",
      "Priority guardrails",
      "Multi-project memory",
      "Advanced recovery history",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "From $24 / seat / month",
    summary: "Shared control for teams using AI coding agents.",
    ctaLabel: "Contact for Team",
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
      "Shared team state",
      "Approvals and audit logs",
      "Shared recovery logs",
      "GitHub checks and policies, coming soon",
    ],
  },
};

export function getPlan(planId: PlanId): Plan {
  return plans[planId];
}

export function hasFeature(planId: PlanId, featureName: PlanFeature): boolean {
  return plans[planId].features.includes(featureName);
}
