/**
 * RunTrim plan entitlements — single source of truth for both server and CLI.
 * Never expose this file to the client browser. Import only from server code or CLI.
 */

export type PlanId = "free" | "pro" | "builder" | "team";

export interface Entitlements {
  /** Max Bridge runs per calendar month. null = unlimited. */
  bridgeRunsPerMonth: number | null;
  /** Cloud sync allowed. */
  cloudSync: boolean;
  /** Max total synced runs during beta. null = unlimited. */
  cloudSyncRunLimit: number | null;
  /** Max tracked projects. null = unlimited. */
  projectLimit: number | null;
  /** Advanced dashboard reports. */
  advancedReports: boolean;
  /** Project memory sync and continuation packs. */
  projectMemory: boolean;
  /** Advanced risk scoring and scope drift. */
  advancedRisk: boolean;
  /** Custom forbidden-file rules. */
  forbiddenFileRules: boolean;
  /** Exportable run reports. */
  exports: boolean;
  /** Team policies, approvals, audit logs. */
  teamControls: boolean;
}

export const PLAN_ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    bridgeRunsPerMonth: 5,
    cloudSync: true,
    cloudSyncRunLimit: 10, // beta: 10 total synced runs
    projectLimit: 1,
    advancedReports: false,
    projectMemory: false,
    advancedRisk: false,
    forbiddenFileRules: false,
    exports: false,
    teamControls: false,
  },
  pro: {
    bridgeRunsPerMonth: null,
    cloudSync: true,
    cloudSyncRunLimit: null,
    projectLimit: 1,
    advancedReports: true,
    projectMemory: true,
    advancedRisk: false,
    forbiddenFileRules: false,
    exports: false,
    teamControls: false,
  },
  builder: {
    bridgeRunsPerMonth: null,
    cloudSync: true,
    cloudSyncRunLimit: null,
    projectLimit: null,
    advancedReports: true,
    projectMemory: true,
    advancedRisk: true,
    forbiddenFileRules: true,
    exports: true,
    teamControls: false,
  },
  team: {
    bridgeRunsPerMonth: null,
    cloudSync: true,
    cloudSyncRunLimit: null,
    projectLimit: null,
    advancedReports: true,
    projectMemory: true,
    advancedRisk: true,
    forbiddenFileRules: true,
    exports: true,
    teamControls: true,
  },
};

export const FREE_BRIDGE_LIMIT   = 5;
export const FREE_SYNC_RUN_LIMIT = 10; // beta

export function getEntitlements(plan: string): Entitlements {
  return PLAN_ENTITLEMENTS[(plan as PlanId)] ?? PLAN_ENTITLEMENTS.free;
}

export function isUnlimitedBridge(plan: string): boolean {
  return getEntitlements(plan).bridgeRunsPerMonth === null;
}

/**
 * Returns true if the subscription is in a state that grants paid-plan access.
 * Only "active" and "trialing" unlock Pro/Builder/Team entitlements.
 * Canceled, past_due, expired, unpaid, etc. fall back to free.
 */
export function isSubscriptionActive(plan: string, planStatus: string | null): boolean {
  if (plan === "free") return true;
  const status = (planStatus ?? "").toLowerCase();
  return status === "active" || status === "trialing";
}

/**
 * Returns the plan ID that should actually be used for entitlement checks.
 * If the subscription is not active/trialing, the user is treated as free.
 */
export function effectivePlanId(plan: string, planStatus: string | null): PlanId {
  if (isSubscriptionActive(plan, planStatus)) {
    return (plan in PLAN_ENTITLEMENTS ? plan : "free") as PlanId;
  }
  return "free";
}

/** Returns the current billing period key, e.g. "2026-05". */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
