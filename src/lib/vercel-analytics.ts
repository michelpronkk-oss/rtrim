/**
 * Vercel Web Analytics Data API
 *
 * Required env vars:
 *   VERCEL_API_TOKEN   — Personal access token from vercel.com/account/tokens
 *   VERCEL_PROJECT_ID  — Project ID from Project Settings > General
 *   VERCEL_TEAM_ID     — (optional) Team ID/slug if the project lives under a team
 *
 * Vercel docs: https://vercel.com/docs/analytics/api
 */

const BASE = "https://vercel.com/api";

export type VercelStats = {
  visitors: number;
  pageviews: number;
  bounceRate: number | null;
  avgDuration: number | null;
};

export type VercelPage = {
  key: string;
  total: number;
  devices: number;
};

export type VercelReferrer = {
  key: string;
  total: number;
  devices: number;
};

export type VercelAnalyticsResult = {
  connected: true;
  stats7d: VercelStats;
  stats24h: VercelStats;
  topPages: VercelPage[];
  referrers: VercelReferrer[];
};

export type VercelAnalyticsDisabled = {
  connected: false;
  reason: "not_configured" | "fetch_error" | "auth_error";
};

export type VercelAnalyticsData = VercelAnalyticsResult | VercelAnalyticsDisabled;

function isConfigured() {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function buildParams(from: Date, to: Date): URLSearchParams {
  const params = new URLSearchParams({
    projectId: process.env.VERCEL_PROJECT_ID!,
    from: from.getTime().toString(),
    to: to.getTime().toString(),
  });
  if (process.env.VERCEL_TEAM_ID) {
    params.set("teamId", process.env.VERCEL_TEAM_ID);
  }
  return params;
}

async function fetchVercel<T>(path: string, params: URLSearchParams): Promise<T | null> {
  const url = `${BASE}${path}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
    next: { revalidate: 300 }, // 5-min server-side cache
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function extractStats(raw: { data?: Partial<VercelStats> } | null): VercelStats {
  return {
    visitors:    raw?.data?.visitors    ?? 0,
    pageviews:   raw?.data?.pageviews   ?? 0,
    bounceRate:  raw?.data?.bounceRate  ?? null,
    avgDuration: raw?.data?.avgDuration ?? null,
  };
}

export async function getVercelAnalytics(): Promise<VercelAnalyticsData> {
  if (!isConfigured()) {
    return { connected: false, reason: "not_configured" };
  }

  const now   = new Date();
  const ago7d = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const ago24h = new Date(now.getTime() -      24 * 60 * 60 * 1000);

  try {
    const [stats7d, stats24h, pages, referrers] = await Promise.all([
      fetchVercel<{ data?: Partial<VercelStats> }>("/v1/web/insights/stats", buildParams(ago7d, now)),
      fetchVercel<{ data?: Partial<VercelStats> }>("/v1/web/insights/stats", buildParams(ago24h, now)),
      fetchVercel<{ data?: VercelPage[] }>("/v1/web/insights/pages", buildParams(ago7d, now)),
      fetchVercel<{ data?: VercelReferrer[] }>("/v1/web/insights/referrers", buildParams(ago7d, now)),
    ]);

    if (stats7d === null) {
      return { connected: false, reason: "auth_error" };
    }

    return {
      connected:  true,
      stats7d:    extractStats(stats7d),
      stats24h:   extractStats(stats24h),
      topPages:   pages?.data ?? [],
      referrers:  referrers?.data ?? [],
    };
  } catch {
    return { connected: false, reason: "fetch_error" };
  }
}
