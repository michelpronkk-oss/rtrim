import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { execa } from "execa";

export type RunTrimPlan = "free";

export interface TrackedRepoEntry {
  id: string;
  name: string;
  path: string;
  gitRemote: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface GlobalRunTrimRegistry {
  version: 1;
  plan: RunTrimPlan;
  trackedRepos: TrackedRepoEntry[];
  telemetry?: {
    enabled: boolean;
    anonymousId: string;
  };
}

export interface CurrentRepoIdentity {
  id: string;
  name: string;
  path: string;
  gitRemote: string;
}

export interface FreeRepoLimitCheck {
  allowed: boolean;
  plan: RunTrimPlan;
  currentRepo: CurrentRepoIdentity;
  trackedRepo: TrackedRepoEntry | null;
}

const DEFAULT_REGISTRY: GlobalRunTrimRegistry = {
  version: 1,
  plan: "free",
  trackedRepos: [],
  telemetry: {
    enabled: false,
    anonymousId: "",
  },
};

function normalizeRepoPath(input: string): string {
  const resolved = path.resolve(input);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function getGlobalRunTrimDir(): string {
  return path.join(os.homedir(), ".runtrim");
}

function getGlobalRegistryPath(): string {
  return path.join(getGlobalRunTrimDir(), "global.json");
}

export function loadGlobalRegistry(): GlobalRunTrimRegistry {
  const registryPath = getGlobalRegistryPath();
  if (!fs.existsSync(registryPath)) return { ...DEFAULT_REGISTRY };
  try {
    const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8")) as Partial<GlobalRunTrimRegistry>;
    return {
      version: 1,
      plan: raw.plan === "free" ? "free" : "free",
      trackedRepos: Array.isArray(raw.trackedRepos)
        ? raw.trackedRepos
            .filter((item): item is TrackedRepoEntry => Boolean(item && typeof item === "object"))
            .map((item) => ({
              id: String(item.id || ""),
              name: String(item.name || ""),
              path: normalizeRepoPath(String(item.path || "")),
              gitRemote: String(item.gitRemote || ""),
              createdAt: String(item.createdAt || ""),
              lastSeenAt: String(item.lastSeenAt || ""),
            }))
            .filter((item) => Boolean(item.id && item.path))
        : [],
      telemetry: {
        enabled:
          typeof raw.telemetry === "object" &&
          raw.telemetry !== null &&
          Boolean((raw.telemetry as { enabled?: boolean }).enabled),
        anonymousId:
          typeof raw.telemetry === "object" &&
          raw.telemetry !== null &&
          typeof (raw.telemetry as { anonymousId?: string }).anonymousId === "string"
            ? String((raw.telemetry as { anonymousId?: string }).anonymousId).slice(0, 120)
            : "",
      },
    };
  } catch {
    return { ...DEFAULT_REGISTRY };
  }
}

export function saveGlobalRegistry(registry: GlobalRunTrimRegistry): void {
  const dir = getGlobalRunTrimDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getGlobalRegistryPath(), JSON.stringify(registry, null, 2), "utf-8");
}

export async function getCurrentRepoIdentity(cwd = process.cwd()): Promise<CurrentRepoIdentity> {
  const normalizedPath = normalizeRepoPath(cwd);
  let gitRemote = "";
  try {
    const { stdout } = await execa("git", ["config", "--get", "remote.origin.url"], {
      cwd,
      stdio: "pipe",
    });
    gitRemote = stdout.trim();
  } catch {
    gitRemote = "";
  }
  const idSeed = gitRemote || normalizedPath;
  const idPrefix = gitRemote ? "remote" : "path";
  return {
    id: `${idPrefix}_${hashValue(idSeed)}`,
    name: path.basename(normalizedPath),
    path: normalizedPath,
    gitRemote,
  };
}

function findTrackedRepo(
  trackedRepos: TrackedRepoEntry[],
  currentRepo: CurrentRepoIdentity
): TrackedRepoEntry | null {
  const byId = trackedRepos.find((repo) => repo.id === currentRepo.id);
  if (byId) return byId;
  const byPath = trackedRepos.find((repo) => normalizeRepoPath(repo.path) === currentRepo.path);
  return byPath ?? null;
}

export async function assertFreeRepoAllowed(cwd = process.cwd()): Promise<FreeRepoLimitCheck> {
  const registry = loadGlobalRegistry();
  const currentRepo = await getCurrentRepoIdentity(cwd);
  const trackedRepo = findTrackedRepo(registry.trackedRepos, currentRepo);

  if (registry.plan !== "free") {
    return { allowed: true, plan: registry.plan, currentRepo, trackedRepo };
  }

  if (trackedRepo) {
    return { allowed: true, plan: registry.plan, currentRepo, trackedRepo };
  }

  if (registry.trackedRepos.length === 0) {
    return { allowed: true, plan: registry.plan, currentRepo, trackedRepo: null };
  }

  return {
    allowed: false,
    plan: registry.plan,
    currentRepo,
    trackedRepo: registry.trackedRepos[0],
  };
}

export async function registerCurrentRepo(cwd = process.cwd()): Promise<TrackedRepoEntry> {
  const registry = loadGlobalRegistry();
  const currentRepo = await getCurrentRepoIdentity(cwd);
  const now = new Date().toISOString();
  const existing = findTrackedRepo(registry.trackedRepos, currentRepo);
  if (existing) {
    existing.lastSeenAt = now;
    existing.name = currentRepo.name;
    existing.path = currentRepo.path;
    existing.gitRemote = currentRepo.gitRemote;
    saveGlobalRegistry(registry);
    return existing;
  }

  const entry: TrackedRepoEntry = {
    id: currentRepo.id,
    name: currentRepo.name,
    path: currentRepo.path,
    gitRemote: currentRepo.gitRemote,
    createdAt: now,
    lastSeenAt: now,
  };
  registry.trackedRepos.push(entry);
  saveGlobalRegistry(registry);
  return entry;
}

export async function unlinkCurrentRepo(
  cwd = process.cwd(),
  force = false
): Promise<{
  removed: boolean;
  forced: boolean;
  currentRepo: CurrentRepoIdentity;
  trackedRepo: TrackedRepoEntry | null;
}> {
  const registry = loadGlobalRegistry();
  const currentRepo = await getCurrentRepoIdentity(cwd);
  const trackedRepo = findTrackedRepo(registry.trackedRepos, currentRepo);
  if (trackedRepo) {
    registry.trackedRepos = registry.trackedRepos.filter((repo) => repo.id !== trackedRepo.id);
    saveGlobalRegistry(registry);
    return { removed: true, forced: false, currentRepo, trackedRepo };
  }

  if (force && registry.trackedRepos.length > 0) {
    const first = registry.trackedRepos[0];
    registry.trackedRepos = [];
    saveGlobalRegistry(registry);
    return { removed: true, forced: true, currentRepo, trackedRepo: first };
  }

  return {
    removed: false,
    forced: false,
    currentRepo,
    trackedRepo: registry.trackedRepos[0] ?? null,
  };
}
