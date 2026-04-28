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
  ctaLabel: string;
  features: PlanFeature[];
  bullets: string[];
}

export const planOrder: PlanId[] = ["free", "pro", "builder", "team"];

export const plans: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "€0",
    ctaLabel: "Install CLI",
    features: [],
    bullets: [
      "Local CLI",
      "runtrim init",
      "runtrim guard",
      "runtrim run in copy mode",
      "basic check",
      "local report",
      "local memory.md",
      "no cloud sync",
      "no hosted dashboard history",
      "no share cards",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "€12/month",
    ctaLabel: "Join early access",
    features: ["cloudSync", "cloudHistory", "shareCards", "weeklyReport"],
    bullets: [
      "unlimited local runs",
      "cloud run history",
      "project memory sync",
      "saved next prompts",
      "weekly savings report",
      "share cards",
      "multi-device dashboard",
      "better model-cost profiles",
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    priceLabel: "€29/month",
    ctaLabel: "Join early access",
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
      "everything in Pro",
      "multiple projects",
      "advanced run check",
      "deeper git diff analysis",
      "custom project rules",
      "sensitive area presets",
      "model recommendation warnings",
      "command wrapper history",
      "exportable run reports",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "starting at €99/month",
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
      "everything in Builder",
      "shared project policies",
      "team run history",
      "org-level savings",
      "GitHub PR summaries",
      "member usage",
      "shared forbidden scopes",
      "budget rules",
    ],
  },
};

export function getPlan(planId: PlanId): Plan {
  return plans[planId];
}

export function hasFeature(planId: PlanId, featureName: PlanFeature): boolean {
  return plans[planId].features.includes(featureName);
}

