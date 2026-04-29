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
  | "exportableReports";

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
    summary: "Local control for one repo.",
    ctaLabel: "Install CLI",
    features: [],
    bullets: [
      "Local CLI",
      "Baseline project audit",
      "Guarded run contracts",
      "Prepare prompt file",
      "Copy-mode runs",
      "Basic check",
      "Local memory and report",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$12/month",
    summary: "Cloud memory for solo builders.",
    ctaLabel: "Join Pro early access",
    features: ["cloudSync", "cloudHistory", "shareCards", "weeklyReport"],
    bullets: [
      "Cloud run history",
      "Project memory sync",
      "Saved continuation prompts",
      "Weekly savings report",
      "Share cards",
      "Multi-device dashboard",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    priceLabel: "$29/month",
    summary: "Multi-project control for serious builders.",
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
    ],
    bullets: [
      "Everything in Pro",
      "Multiple projects",
      "Advanced run checks",
      "Deeper git diff analysis",
      "Custom project rules",
      "Model recommendations",
      "Exportable run reports",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "from $99/month",
    summary: "Policies and visibility for teams.",
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
    ],
    bullets: [
      "Everything in Builder",
      "Shared run policies",
      "Team run history",
      "Org-level savings",
      "GitHub PR summaries",
      "Budget rules",
    ],
  },
};

export function getPlan(planId: PlanId): Plan {
  return plans[planId];
}

export function hasFeature(planId: PlanId, featureName: PlanFeature): boolean {
  return plans[planId].features.includes(featureName);
}
