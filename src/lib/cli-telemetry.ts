import crypto from "crypto";
import { getCurrentRepoIdentity, loadGlobalRegistry, saveGlobalRegistry } from "./global-registry";
import { configExists, loadConfig } from "./runtrim-config";

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function ensureAnonymousId(): string {
  const registry = loadGlobalRegistry();
  const existing = registry.telemetry?.anonymousId?.trim();
  if (existing) return existing;
  const next = `cli_${hash(`${Date.now()}_${Math.random()}`)}`;
  registry.telemetry = {
    enabled: Boolean(registry.telemetry?.enabled),
    anonymousId: next,
  };
  saveGlobalRegistry(registry);
  return next;
}

function telemetryEnabled(cwd: string): boolean {
  const registry = loadGlobalRegistry();
  const globalEnabled = Boolean(registry.telemetry?.enabled);
  const localEnabled = configExists(cwd) ? Boolean(loadConfig(cwd).telemetry?.enabled) : false;
  return globalEnabled || localEnabled;
}

function resolveEventsEndpoint(dashboardUrl?: string): string {
  if (process.env.RUNTRIM_EVENTS_URL?.trim()) return process.env.RUNTRIM_EVENTS_URL.trim();
  try {
    if (dashboardUrl) {
      const origin = new URL(dashboardUrl).origin;
      return `${origin}/api/events`;
    }
  } catch {
    // ignore
  }
  return "http://localhost:3000/api/events";
}

export async function trackCliCommandEvent(input: {
  commandName: string;
  status: "ok" | "error";
  durationMs?: number;
  cwd?: string;
  cliVersion?: string;
}): Promise<void> {
  const cwd = input.cwd ?? process.cwd();
  if (!telemetryEnabled(cwd)) return;

  const commandMap: Record<string, string> = {
    start: "cli_start",
    init: "cli_init",
    prepare: "cli_prepare",
    run: "cli_run",
    watch: "cli_watch",
    check: "cli_check",
    continue: "cli_continue",
    memory: "cli_memory",
    report: "cli_report",
    sync: "cli_sync",
    panel: "cli_panel",
  };
  const eventName = commandMap[input.commandName] || "cli_error";
  const anonymousId = ensureAnonymousId();

  let projectId = "";
  try {
    const id = await getCurrentRepoIdentity(cwd);
    projectId = hash(id.id);
  } catch {
    projectId = "";
  }

  const cfg = configExists(cwd) ? loadConfig(cwd) : null;
  const endpoint = resolveEventsEndpoint(cfg?.dashboardUrl);

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName,
        source: "cli",
        anonymousId,
        projectId: projectId || undefined,
        cliVersion: input.cliVersion ?? "",
        metadata: {
          command: input.commandName,
          status: input.status,
          durationMs: typeof input.durationMs === "number" ? Math.round(input.durationMs) : undefined,
        },
      }),
    });
  } catch {
    // noop
  }
}
