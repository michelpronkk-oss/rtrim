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
    summary: "Local CLI for saving and inspecting AI coding runs.",
    ctaLabel: "Install CLI",
    features: [],
    bullets: [
      "Local CLI",
      "Run history (local)",
      "Reusable context (local)",
      "Token savings estimate",
      "Cost savings estimate",
      "Basic reports",
      "Clean continuation",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$12/month",
    summary: "Cloud memory, reports, continuation packs, and Agent early access.",
    ctaLabel: "Join Pro early access",
    features: ["cloudSync", "cloudHistory", "shareCards", "weeklyReport", "agentEarlyAccess"],
    bullets: [
      "Cloud run history",
      "Project memory sync",
      "Saved continuation prompts",
      "Weekly savings report",
      "Share cards",
      "Agent early access",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    priceLabel: "$29/month",
    summary: "Project guardrails, risk scores, scope drift detection, and timelines.",
    ctaLabel: "Join early access",
    badge: "Recommended",
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
      "Scope drift detection",
      "Custom project rules",
      "Risk scores (advanced)",
      "Exportable run reports",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "from $99/month",
    summary: "Shared workspaces, policies, GitHub checks, audit logs, and team control.",
    ctaLabel: "Coming soon",
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
      "Shared run policies",
      "Team run history",
      "GitHub PR checks",
      "Audit logs",
      "Org-level budget rules",
    ],
  },
};

export function getPlan(planId: PlanId): Plan {
  return plans[planId];
}

export function hasFeature(planId: PlanId, featureName: PlanFeature): boolean {
  return plans[planId].features.includes(featureName);
}
