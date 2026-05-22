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
 * Returns true if the subscription currently grants paid-plan access.
 *
 * - active / trialing  → access granted
 * - canceled           → access granted ONLY if still within the paid period
 *                        (graceful degradation: user keeps features until period_end)
 * - past_due           → access revoked immediately (payment required)
 * - expired / unpaid   → access revoked
 */
export function isSubscriptionActive(
  plan: string,
  planStatus: string | null,
  periodEnd: string | null = null,
): boolean {
  if (plan === "free") return true;
  const status = (planStatus ?? "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  // Canceled but still inside the billing period → keep access
  if ((status === "canceled" || status === "cancelled") && periodEnd) {
    return new Date(periodEnd) > new Date();
  }
  return false;
}

/**
 * Returns the plan ID used for entitlement checks.
 * Accepts periodEnd so canceled-but-in-period users keep their features.
 */
export function effectivePlanId(
  plan: string,
  planStatus: string | null,
  periodEnd: string | null = null,
): PlanId {
  if (isSubscriptionActive(plan, planStatus, periodEnd)) {
    return (plan in PLAN_ENTITLEMENTS ? plan : "free") as PlanId;
  }
  return "free";
}

/** Returns the current billing period key, e.g. "2026-05". */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
