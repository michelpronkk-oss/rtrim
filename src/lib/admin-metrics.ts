import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId, isSubscriptionActive } from "@/lib/entitlements";

type EventRow = {
  event_name: string;
  source: string | null;
  anonymous_id: string | null;
  page_path: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

type EarlyAccessRow = {
  id: string;
  email: string | null;
  role: string | null;
  plan_interest: string | null;
  status: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  plan: string | null;
  plan_status: string | null;
  current_period_end: string | null;
  payment_subscription_id: string | null;
  cli_token_hash: string | null;
};

function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function countDistinct(items: Array<string | null | undefined>): number {
  return new Set(items.filter((v): v is string => Boolean(v))).size;
}

function classifyReferrer(raw: string): string {
  const r = raw.toLowerCase().trim();
  if (!r || r === "direct" || r === "(direct)") return "Direct";
  if (r.includes("x.com") || r.includes("twitter")) return "X/Twitter";
  if (r.includes("reddit")) return "Reddit";
  if (r.includes("github")) return "GitHub";
  if (r.includes("google")) return "Google";
  if (r.includes("producthunt")) return "Product Hunt";
  return "Unknown";
}

function eventOrCommand(event: EventRow): string {
  const eventName = (event.event_name || "").toLowerCase();
  if (eventName && eventName !== "cli_error") return eventName;
  const cmd = typeof event.metadata?.command === "string" ? event.metadata.command.toLowerCase().trim() : "";
  return cmd ? `cmd:${cmd}` : eventName;
}

const FUNNEL_DEFS: Array<{ step: string; aliases: string[]; recommendedEvent?: string }> = [
  { step: "page_view", aliases: ["page_view"], recommendedEvent: "page_view" },
  { step: "install_cta_clicked", aliases: ["install_cta_clicked"], recommendedEvent: "install_cta_clicked" },
  { step: "install_command_copied", aliases: ["install_command_copied"], recommendedEvent: "install_command_copied" },
  { step: "cli_start", aliases: ["cli_start", "cmd:start"], recommendedEvent: "cli_start" },
  { step: "guarded_run_created", aliases: ["cli_prepare", "cli_agent", "cli_agent_run", "cmd:agent", "cmd:prepare"], recommendedEvent: "cli_agent_prepare" },
  { step: "cli_finish", aliases: ["cli_finish", "cmd:finish"], recommendedEvent: "cli_finish" },
  { step: "cli_continue_or_restore", aliases: ["cli_continue", "cmd:continue", "cmd:restore"], recommendedEvent: "cli_continue" },
  { step: "cli_connected", aliases: ["cli_login_connected", "cmd:login"], recommendedEvent: "cli_login_connected" },
  { step: "checkout_started", aliases: ["checkout_started", "pricing_cta_clicked"], recommendedEvent: "checkout_started" },
  { step: "subscription_active", aliases: ["subscription_active"], recommendedEvent: "subscription_active" },
];

const CLI_METRIC_DEFS: Array<{ label: string; aliases: string[]; recommendedEvent?: string }> = [
  { label: "cli_start", aliases: ["cli_start", "cmd:start"], recommendedEvent: "cli_start" },
  { label: "cli_agent_prepare", aliases: ["cli_prepare", "cli_agent", "cli_agent_run", "cmd:agent", "cmd:prepare"], recommendedEvent: "cli_agent_prepare" },
  { label: "cli_finish", aliases: ["cli_finish", "cmd:finish"], recommendedEvent: "cli_finish" },
  { label: "cli_restore_preview", aliases: ["cli_restore_preview", "cmd:restore"], recommendedEvent: "cli_restore_preview" },
  { label: "cli_restore_apply", aliases: ["cli_restore_apply"], recommendedEvent: "cli_restore_apply" },
  { label: "cli_continue", aliases: ["cli_continue", "cmd:continue"], recommendedEvent: "cli_continue" },
  { label: "cli_login_connected", aliases: ["cli_login_connected", "cmd:login"], recommendedEvent: "cli_login_connected" },
  { label: "cli_sync_success", aliases: ["cli_sync_success", "cli_sync", "cmd:sync"], recommendedEvent: "cli_sync_success" },
];

function countByAliases(events: EventRow[], aliases: string[]): number {
  const set = new Set(aliases.map((a) => a.toLowerCase()));
  return events.filter((e) => set.has(eventOrCommand(e))).length;
}

export async function getAdminMetrics() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      ok: false,
      error: "supabase_not_configured",
      summary: null,
      revenue: null,
      planSegments: [],
      funnel: [],
      topPages: [],
      cliMetrics: [],
      cliEvents: [],
      recentEvents: [],
      referrerBreakdown: [],
      trackingGaps: [],
      earlyAccess: [],
    };
  }

  const since30d = startOfDaysAgo(30);
  const { data: rows, error } = await supabase
    .from("runtrim_events")
    .select("event_name,source,anonymous_id,page_path,created_at,metadata")
    .gte("created_at", since30d)
    .order("created_at", { ascending: false })
    .limit(8000);

  if (error) {
    return {
      ok: false,
      error: "metrics_query_failed",
      summary: null,
      revenue: null,
      planSegments: [],
      funnel: [],
      topPages: [],
      cliMetrics: [],
      cliEvents: [],
      recentEvents: [],
      referrerBreakdown: [],
      trackingGaps: [],
      earlyAccess: [],
    };
  }

  const events = (rows ?? []) as EventRow[];
  const last24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last7dIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last24 = events.filter((e) => e.created_at >= last24hIso);
  const last7 = events.filter((e) => e.created_at >= last7dIso);

  const pageViews7d = countByAliases(last7, ["page_view"]);
  const installCtaClicks7d = countByAliases(last7, ["install_cta_clicked"]);
  const installCommandCopies7d = countByAliases(last7, ["install_command_copied"]);
  const cliStarts7d = countByAliases(last7, ["cli_start", "cmd:start"]);
  const guardedRuns7d = countByAliases(last7, ["cli_prepare", "cli_agent", "cli_agent_run", "cmd:agent", "cmd:prepare"]);
  const cliFinishes7d = countByAliases(last7, ["cli_finish", "cmd:finish"]);
  const cliConnectedUsers7d = countDistinct(
    last7.filter((e) => ["cmd:login", "cli_login_connected"].includes(eventOrCommand(e))).map((e) => e.anonymous_id)
  );

  const pageMap = new Map<string, { views: number; users: Set<string> }>();
  for (const e of last7.filter((x) => eventOrCommand(x) === "page_view")) {
    const key = e.page_path || "/";
    if (!pageMap.has(key)) pageMap.set(key, { views: 0, users: new Set() });
    const slot = pageMap.get(key)!;
    slot.views += 1;
    if (e.anonymous_id) slot.users.add(e.anonymous_id);
  }
  const topPages = [...pageMap.entries()]
    .map(([pagePath, v]) => ({ pagePath, views: v.views, uniqueUsers: v.users.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const referrerMap = new Map<string, number>();
  const pageViewEvents = last7.filter((x) => eventOrCommand(x) === "page_view");
  for (const e of pageViewEvents) {
    const rawRef = typeof e.metadata?.referrer === "string" ? e.metadata.referrer : "";
    const label = classifyReferrer(rawRef);
    referrerMap.set(label, (referrerMap.get(label) ?? 0) + 1);
  }
  const referrerBreakdown = [...referrerMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
  const sourceAttributionLimited = referrerBreakdown.length <= 1 && (referrerBreakdown[0]?.source ?? "Direct") === "Direct";

  const cliRawMap = new Map<string, { count: number; lastSeen: string }>();
  for (const e of last7.filter((x) => x.source === "cli")) {
    const key = eventOrCommand(e);
    if (!cliRawMap.has(key)) cliRawMap.set(key, { count: 0, lastSeen: e.created_at });
    const slot = cliRawMap.get(key)!;
    slot.count += 1;
    if (e.created_at > slot.lastSeen) slot.lastSeen = e.created_at;
  }
  const cliEvents = [...cliRawMap.entries()]
    .map(([eventName, v]) => ({ eventName, count: v.count, lastSeen: v.lastSeen }))
    .sort((a, b) => b.count - a.count);

  const cliMetrics = CLI_METRIC_DEFS.map((def) => {
    const count = countByAliases(last7, def.aliases);
    const tracked = count > 0;
    return { label: def.label, count, tracked, recommendedEvent: tracked ? undefined : def.recommendedEvent };
  });

  const funnel = FUNNEL_DEFS.map((def) => {
    const count = countByAliases(last7, def.aliases);
    const tracked = count > 0;
    return { step: def.step, count, tracked, recommendedEvent: tracked ? undefined : def.recommendedEvent };
  });

  const trackingGaps = [
    ...funnel.filter((f) => !f.tracked).map((f) => ({
      key: f.step,
      recommendedEvent: f.recommendedEvent ?? f.step,
      note: "Not tracked yet in current 7d data.",
    })),
  ];

  const profilesQuery = await supabase
    .from("runtrim_profiles")
    .select("id, plan, plan_status, current_period_end, payment_subscription_id, cli_token_hash")
    .limit(10000);
  const profiles = (profilesQuery.data ?? []) as ProfileRow[];

  const normalizedProfiles = profiles.map((p) => {
    const rawPlan = (p.plan ?? "free").toLowerCase();
    const plan = ["free", "pro", "builder", "team"].includes(rawPlan) ? rawPlan : "unknown";
    const active = isSubscriptionActive(plan === "unknown" ? "free" : plan, p.plan_status ?? null, p.current_period_end ?? null);
    const effectivePlan = plan === "unknown" ? "unknown" : effectivePlanId(plan, p.plan_status ?? null, p.current_period_end ?? null);
    const effective = plan === "unknown" ? "unknown" : active ? effectivePlan : "free";
    return {
      ...p,
      normalizedPlan: effective as "free" | "pro" | "builder" | "team" | "unknown",
      activeSubscription: active && (effectivePlan === "pro" || effectivePlan === "builder" || effectivePlan === "team"),
    };
  });

  const paidProfiles = normalizedProfiles.filter((p) => p.activeSubscription);
  const proCount = paidProfiles.filter((p) => p.normalizedPlan === "pro").length;
  const builderCount = paidProfiles.filter((p) => p.normalizedPlan === "builder").length;
  const teamCount = paidProfiles.filter((p) => p.normalizedPlan === "team").length;
  const trialUsers = normalizedProfiles.filter((p) => (p.plan_status ?? "").toLowerCase() === "trialing").length;
  const paymentIssueUsers = normalizedProfiles.filter((p) =>
    ["past_due", "failed", "on_hold", "unpaid"].includes((p.plan_status ?? "").toLowerCase())
  ).length;
  const teamSeats = null;
  const estimatedMrr = proCount * 29 + builderCount * 49 + teamCount * 24;
  const revenue = {
    estimatedMrr,
    isEstimated: true,
    paidUsers: paidProfiles.length,
    proCount,
    builderCount,
    teamCount,
    teamSeats,
    trialUsers,
    paymentIssueUsers,
  };

  const activeEventUsers7d = new Set(last7.map((e) => e.anonymous_id).filter(Boolean) as string[]);
  const planSegments = (["free", "pro", "builder", "team", "unknown"] as const).map((plan) => {
    const rowsForPlan = normalizedProfiles.filter((p) => p.normalizedPlan === plan);
    return {
      plan,
      users: rowsForPlan.length,
      connectedCliUsers: rowsForPlan.filter((r) => Boolean(r.cli_token_hash)).length,
      recentlyActiveUsers7d: Math.min(rowsForPlan.length, activeEventUsers7d.size),
    };
  });

  let earlyAccess: EarlyAccessRow[] = [];
  const earlyAccessQuery = await supabase
    .from("runtrim_early_access")
    .select("id, email, role, plan_interest, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!earlyAccessQuery.error) {
    earlyAccess = (earlyAccessQuery.data ?? []) as EarlyAccessRow[];
  }

  const recentEvents = events.slice(0, 50).map((e) => {
    const mdPlan = typeof e.metadata?.plan === "string" ? e.metadata.plan : undefined;
    return {
      eventName: eventOrCommand(e),
      source: e.source ?? "web",
      pagePath: e.page_path ?? "",
      createdAt: e.created_at,
      plan: mdPlan,
    };
  });

  const summary = {
    uniqueVisitors24h: countDistinct(last24.map((e) => e.anonymous_id)),
    uniqueVisitors7d: countDistinct(last7.map((e) => e.anonymous_id)),
    pageViews7d,
    installCtaClicks7d,
    installCommandCopies7d,
    cliStarts7d,
    guardedRuns7d,
    cliFinishes7d,
    cliConnectedUsers7d,
    paidUsers: revenue.paidUsers,
    mrr: revenue.estimatedMrr,
    sourceAttributionLimited,
  };

  return {
    ok: true,
    summary,
    revenue,
    planSegments,
    funnel,
    topPages,
    cliMetrics,
    cliEvents,
    recentEvents,
    referrerBreakdown,
    trackingGaps,
    earlyAccess,
  };
}
