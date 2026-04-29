import crypto from "crypto";
import { headers } from "next/headers";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const ALLOWED_EVENT_NAMES: Set<string> = new Set([
  "page_view",
  "install_cta_clicked",
  "install_command_copied",
  "early_access_opened",
  "early_access_submitted",
  "pricing_cta_clicked",
  "docs_clicked",
  "how_it_works_clicked",
  "cli_start",
  "cli_init",
  "cli_prepare",
  "cli_run",
  "cli_watch",
  "cli_check",
  "cli_continue",
  "cli_memory",
  "cli_report",
  "cli_sync",
  "cli_panel",
  "cli_error",
] as const);

export type AnalyticsSource = "web" | "cli";

export interface EventInput {
  eventName: string;
  source?: AnalyticsSource;
  anonymousId?: string;
  sessionId?: string;
  projectId?: string;
  cliVersion?: string;
  pagePath?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

function truncate(input: string, max = 180): string {
  return input.length > max ? `${input.slice(0, max - 3)}...` : input;
}

function sanitizeEventName(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 64);
  return ALLOWED_EVENT_NAMES.has(normalized) ? normalized : "unknown_event";
}

function sanitizeSource(value: string | undefined): AnalyticsSource {
  return value === "cli" ? "cli" : "web";
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("code") ||
    lower.includes("prompt") ||
    lower.includes("file") ||
    lower.includes("path") ||
    lower.includes("secret") ||
    lower.includes("token") ||
    lower.includes("env") ||
    lower.includes("content")
  );
}

function sanitizeScalar(value: unknown): string | number | boolean | null {
  if (typeof value === "string") return truncate(value, 180);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value;
  return null;
}

function sanitizeMetadata(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) continue;
    if (out && Object.keys(out).length >= 20) break;
    if (Array.isArray(value)) {
      out[key] = value
        .slice(0, 8)
        .map((v) => sanitizeScalar(v))
        .filter((v) => v !== null);
      continue;
    }
    if (value && typeof value === "object") continue;
    const sanitized = sanitizeScalar(value);
    if (sanitized !== null) out[key] = sanitized;
  }
  return out;
}

function sanitizeId(value: string | undefined): string | null {
  if (!value) return null;
  const clean = value.trim().slice(0, 120);
  if (!clean) return null;
  return clean;
}

export async function recordEvent(input: EventInput): Promise<{ ok: boolean }> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { ok: false };

  const h = await headers();
  const ua = truncate(h.get("user-agent") || "", 250);
  const source = sanitizeSource(input.source);
  const payload = {
    event_name: sanitizeEventName(input.eventName),
    source,
    anonymous_id: sanitizeId(input.anonymousId),
    session_id: sanitizeId(input.sessionId),
    project_id: sanitizeId(input.projectId),
    cli_version: sanitizeId(input.cliVersion),
    page_path: sanitizeId(input.pagePath),
    referrer: sanitizeId(input.referrer),
    user_agent: ua || null,
    country: truncate(h.get("x-vercel-ip-country") || "", 32) || null,
    metadata: sanitizeMetadata(input.metadata),
  };

  const { error } = await supabase.from("runtrim_events").insert(payload);
  if (error) return { ok: false };
  return { ok: true };
}

export function hashProjectId(seed: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(seed).digest("hex").slice(0, 24);
}
