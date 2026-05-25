import { getSupabaseServiceClient } from "@/lib/supabase-server";

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
  agent: string | null;
  use_case: string | null;
  plan_interest: string | null;
  workflow: string | null;
  biggest_pain: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  reviewed_by: string | null;
  decision_note: string | null;
  approval_email_sent_at: string | null;
  rejection_email_sent_at: string | null;
};

function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function countDistinct(items: Array<string | null | undefined>): number {
  return new Set(items.filter((v): v is string => Boolean(v))).size;
}

function safePercent(num: number, den: number): number {
  if (!den) return 0;
  return Math.round((num / den) * 100 * 10) / 10;
}

const AI_REFERRER_SOURCES = new Set(["chatgpt", "claude.ai", "perplexity"]);

function classifyReferrer(raw: string): { source: string; isAI: boolean } {
  const r = raw.toLowerCase().trim();
  if (r.includes("chatgpt") || r.includes("openai.com")) return { source: "ChatGPT", isAI: true };
  if (r.includes("claude.ai") || r.includes("anthropic")) return { source: "Claude.ai", isAI: true };
  if (r.includes("perplexity")) return { source: "Perplexity", isAI: true };
  if (r.includes("google")) return { source: "Google", isAI: false };
  if (r.includes("twitter") || r.includes("x.com") || r === "x") return { source: "X/Twitter", isAI: false };
  if (r.includes("github")) return { source: "GitHub", isAI: false };
  if (r.includes("news.ycombinator") || r.includes("hacker news") || r === "hn") return { source: "Hacker News", isAI: false };
  if (r.includes("reddit")) return { source: "Reddit", isAI: false };
  if (r.includes("linkedin")) return { source: "LinkedIn", isAI: false };
  if (r === "" || r === "direct" || r === "(direct)") return { source: "(direct)", isAI: false };
  return { source: "Other", isAI: false };
}

// Suppress unused-variable warning — AI_REFERRER_SOURCES is used implicitly via classifyReferrer
void AI_REFERRER_SOURCES;

export async function getAdminMetrics() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return {
      ok: false,
      error: "supabase_not_configured",
      summary: null,
      daily: [],
      funnel: [],
      topPages: [],
      cliEvents: [],
      earlyAccess: [],
      recentEvents: [],
      conversionRates: null,
      referrerBreakdown: [],
    };
  }

  const since30d = startOfDaysAgo(30);
  const { data: rows, error } = await supabase
    .from("runtrim_events")
    .select("event_name,source,anonymous_id,page_path,created_at,metadata")
    .gte("created_at", since30d)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return {
      ok: false,
      error: "metrics_query_failed",
      summary: null,
      daily: [],
      funnel: [],
      topPages: [],
      cliEvents: [],
      earlyAccess: [],
      recentEvents: [],
      conversionRates: null,
      referrerBreakdown: [],
    };
  }

  const events = (rows ?? []) as EventRow[];
  const last24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last7dIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const last24 = events.filter((e) => e.created_at >= last24hIso);
  const last7 = events.filter((e) => e.created_at >= last7dIso);

  // Extended summary fields
  const cliLast7 = last7.filter((e) => e.source === "cli");
  const cliUniqueUsers7d = countDistinct(cliLast7.map((e) => e.anonymous_id));
  const cliFinishes7d = last7.filter((e) => e.event_name === "cli_finish").length;
  const cliAgentRuns7d = last7.filter(
    (e) => e.event_name === "cli_agent" || e.event_name === "cli_agent_run"
  ).length;
  const installCtaClicks7d = last7.filter((e) => e.event_name === "install_cta_clicked").length;

  const summary = {
    uniqueVisitors24h: countDistinct(last24.map((e) => e.anonymous_id)),
    uniqueVisitors7d: countDistinct(last7.map((e) => e.anonymous_id)),
    pageViews7d: last7.filter((e) => e.event_name === "page_view").length,
    installCopies7d: last7.filter((e) => e.event_name === "install_command_copied").length,
    earlyAccessRequests7d: last7.filter((e) => e.event_name === "early_access_submitted").length,
    cliStarts7d: last7.filter((e) => e.event_name === "cli_start").length,
    cliPrepares7d: last7.filter((e) => e.event_name === "cli_prepare").length,
    cliChecks7d: last7.filter((e) => e.event_name === "cli_check").length,
    syncedProjects30d: countDistinct(
      events
        .filter((e) => e.event_name === "cli_sync")
        .map((e) => {
          const md = e.metadata ?? {};
          const pid = md.projectId;
          return typeof pid === "string" ? pid : e.anonymous_id;
        })
    ),
    // Extended
    cliUniqueUsers7d,
    cliFinishes7d,
    cliAgentRuns7d,
    installCtaClicks7d,
  };

  // Conversion rates
  const pageViews7d = summary.pageViews7d;
  const installCtaClicks = installCtaClicks7d;
  const installCopies = summary.installCopies7d;
  const cliStarts = summary.cliStarts7d;

  const conversionRates = {
    visitToInstallCta: safePercent(installCtaClicks, pageViews7d),
    ctaToInstallCopy: safePercent(installCopies, installCtaClicks),
    copyToCli: safePercent(cliStarts, installCopies),
  };

  // Referrer breakdown from page_view events last 7d
  const referrerMap = new Map<string, { count: number; isAI: boolean }>();
  for (const e of last7.filter((x) => x.event_name === "page_view")) {
    const rawRef =
      typeof e.metadata?.referrer === "string" ? e.metadata.referrer : "";
    const { source, isAI } = classifyReferrer(rawRef);
    const existing = referrerMap.get(source);
    if (existing) {
      existing.count += 1;
    } else {
      referrerMap.set(source, { count: 1, isAI });
    }
  }
  const referrerBreakdown = [...referrerMap.entries()]
    .map(([source, v]) => ({ source, count: v.count, isAI: v.isAI }))
    .sort((a, b) => b.count - a.count);

  const dailyMap = new Map<
    string,
    {
      date: string;
      visitorsSet: Set<string>;
      pageViews: number;
      installCopies: number;
      earlyAccess: number;
      cliStarts: number;
      cliPrepares: number;
      cliChecks: number;
    }
  >();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, {
      date: key,
      visitorsSet: new Set(),
      pageViews: 0,
      installCopies: 0,
      earlyAccess: 0,
      cliStarts: 0,
      cliPrepares: 0,
      cliChecks: 0,
    });
  }
  for (const e of events) {
    const key = dayKey(e.created_at);
    const slot = dailyMap.get(key);
    if (!slot) continue;
    if (e.anonymous_id) slot.visitorsSet.add(e.anonymous_id);
    if (e.event_name === "page_view") slot.pageViews += 1;
    if (e.event_name === "install_command_copied") slot.installCopies += 1;
    if (e.event_name === "early_access_submitted") slot.earlyAccess += 1;
    if (e.event_name === "cli_start") slot.cliStarts += 1;
    if (e.event_name === "cli_prepare") slot.cliPrepares += 1;
    if (e.event_name === "cli_check") slot.cliChecks += 1;
  }
  const daily = [...dailyMap.values()]
    .map((d) => ({
      date: d.date,
      visitors: d.visitorsSet.size,
      pageViews: d.pageViews,
      installCopies: d.installCopies,
      earlyAccess: d.earlyAccess,
      cliStarts: d.cliStarts,
      cliPrepares: d.cliPrepares,
      cliChecks: d.cliChecks,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const funnelEventNames = [
    "page_view",
    "install_cta_clicked",
    "install_command_copied",
    "cli_start",
    "cli_prepare",
    "early_access_submitted",
  ];
  const funnel = funnelEventNames.map((name) => ({
    step: name,
    count: last7.filter((e) => e.event_name === name).length,
  }));

  const pageMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (const e of last7.filter((x) => x.event_name === "page_view")) {
    const key = e.page_path || "/";
    if (!pageMap.has(key)) pageMap.set(key, { views: 0, visitors: new Set() });
    const slot = pageMap.get(key)!;
    slot.views += 1;
    if (e.anonymous_id) slot.visitors.add(e.anonymous_id);
  }
  const topPages = [...pageMap.entries()]
    .map(([pagePath, v]) => ({ pagePath, views: v.views, uniqueUsers: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  const cliMap = new Map<string, { count: number; lastSeen: string }>();
  for (const e of last7.filter((x) => x.source === "cli")) {
    const key = e.event_name;
    if (!cliMap.has(key)) cliMap.set(key, { count: 0, lastSeen: e.created_at });
    const slot = cliMap.get(key)!;
    slot.count += 1;
    if (e.created_at > slot.lastSeen) slot.lastSeen = e.created_at;
  }
  const cliEvents = [...cliMap.entries()]
    .map(([eventName, v]) => ({ eventName, count: v.count, lastSeen: v.lastSeen }))
    .sort((a, b) => b.count - a.count);

  let earlyAccess: Array<EarlyAccessRow> = [];
  let earlyAccessTableFound = true;
  const earlyAccessQuery = await supabase
    .from("runtrim_early_access")
    .select("id,email,role,agent,use_case,plan_interest,workflow,biggest_pain,notes,status,created_at,approved_at,rejected_at,reviewed_by,decision_note,approval_email_sent_at,rejection_email_sent_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (earlyAccessQuery.error) {
    if (earlyAccessQuery.error.code === "42P01") {
      earlyAccessTableFound = false;
    }
  } else {
    earlyAccess = (earlyAccessQuery.data ?? []) as EarlyAccessRow[];
  }

  const recentEvents = events.slice(0, 40).map((e) => ({
    eventName: e.event_name,
    source: e.source ?? "web",
    pagePath: e.page_path ?? "",
    createdAt: e.created_at,
  }));

  return {
    ok: true,
    summary,
    daily,
    funnel,
    topPages,
    cliEvents,
    earlyAccess,
    earlyAccessTableFound,
    recentEvents,
    conversionRates,
    referrerBreakdown,
  };
}
