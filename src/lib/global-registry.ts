import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { execa } from "execa";

export type RunTrimPlan = "free" | "pro" | "builder" | "team";

/** CLI-side entitlement limits — mirrors entitlements.ts for CLI builds without web deps. */
export const CLI_PLAN_LIMITS = {
  free:    { repoLimit: 1,    localRestoreLimit: 5,    localReportLimit: 10,  cloudSync: false, ciGate: false, multiProject: false },
  pro:     { repoLimit: 1,    localRestoreLimit: null, localReportLimit: null, cloudSync: true,  ciGate: false, multiProject: false },
  builder: { repoLimit: null, localRestoreLimit: null, localReportLimit: null, cloudSync: true,  ciGate: true,  multiProject: true  },
  team:    { repoLimit: null, localRestoreLimit: null, localReportLimit: null, cloudSync: true,  ciGate: true,  multiProject: true  },
} as const;

const VALID_PLANS: RunTrimPlan[] = ["free", "pro", "builder", "team"];

function parsePlan(raw: unknown): RunTrimPlan {
  return VALID_PLANS.includes(raw as RunTrimPlan) ? (raw as RunTrimPlan) : "free";
}

export interface TrackedRepoEntry {
  id: string;
  name: string;
  path: string;
  gitRemote: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface GlobalRunTrimRegistry {
  version: 2;
  stateVersion: 2;
  plan: RunTrimPlan;
  machineInstallId: string;
  createdAt: string;
  updatedAt: string;
  trackedRepos: TrackedRepoEntry[];
  lastKnownRepo: Pick<TrackedRepoEntry, "id" | "name" | "path" | "gitRemote" | "lastSeenAt"> | null;
  integrity: {
    algorithm: "sha256-local-seal-v1";
    seal: string;
  };
  telemetry?: {
    enabled: boolean;
    anonymousId: string;
  };
}

interface InstallState {
  machineInstallId: string;
  createdAt: string;
  updatedAt: string;
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
  status: "allowed" | "blocked_limit" | "blocked_repair";
  repairRequired: boolean;
  repairReason: string | null;
  registryPath: string;
}

const EMPTY_TELEMETRY = { enabled: false, anonymousId: "" };

function normalizeRepoPath(input: string): string {
  const resolved = path.resolve(input);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

export function getGlobalRunTrimDir(): string {
  return path.join(os.homedir(), ".runtrim");
}

function getGlobalRegistryPath(): string {
  return path.join(getGlobalRunTrimDir(), "global.json");
}

function getInstallStatePath(): string {
  return path.join(getGlobalRunTrimDir(), "install-state.json");
}

function buildSealInput(registry: Omit<GlobalRunTrimRegistry, "integrity">): string {
  const tracked = [...registry.trackedRepos]
    .map((r) => ({
      id: r.id,
      name: r.name,
      path: normalizeRepoPath(r.path),
      gitRemote: r.gitRemote,
      createdAt: r.createdAt,
      lastSeenAt: r.lastSeenAt,
    }))
    .sort((a, b) => `${a.id}:${a.path}`.localeCompare(`${b.id}:${b.path}`));
  const payload = {
    version: registry.version,
    stateVersion: registry.stateVersion,
    plan: registry.plan,
    machineInstallId: registry.machineInstallId,
    createdAt: registry.createdAt,
    updatedAt: registry.updatedAt,
    trackedRepos: tracked,
    lastKnownRepo: registry.lastKnownRepo
      ? {
          ...registry.lastKnownRepo,
          path: normalizeRepoPath(registry.lastKnownRepo.path),
        }
      : null,
  };
  return JSON.stringify(payload);
}

function computeSeal(registry: Omit<GlobalRunTrimRegistry, "integrity">): string {
  return crypto.createHash("sha256").update(buildSealInput(registry)).digest("hex");
}

function sanitizeTrackedRepoEntry(input: Partial<TrackedRepoEntry>): TrackedRepoEntry | null {
  const id = String(input.id ?? "").trim();
  const rawPath = String(input.path ?? "").trim();
  if (!id || !rawPath) return null;
  return {
    id,
    name: String(input.name ?? "").trim(),
    path: normalizeRepoPath(rawPath),
    gitRemote: String(input.gitRemote ?? "").trim(),
    createdAt: String(input.createdAt ?? "").trim(),
    lastSeenAt: String(input.lastSeenAt ?? "").trim(),
  };
}

function readInstallStateRaw(): { exists: boolean; state: InstallState | null } {
  const p = getInstallStatePath();
  if (!fs.existsSync(p)) return { exists: false, state: null };
  try {
    const parsed = JSON.parse(fs.readFileSync(p, "utf-8")) as Partial<InstallState>;
    const machineInstallId = String(parsed.machineInstallId ?? "").trim();
    if (!machineInstallId) return { exists: true, state: null };
    return {
      exists: true,
      state: {
        machineInstallId,
        createdAt: String(parsed.createdAt ?? "").trim() || nowIso(),
        updatedAt: String(parsed.updatedAt ?? "").trim() || nowIso(),
      },
    };
  } catch {
    return { exists: true, state: null };
  }
}

function writeInstallState(state: InstallState): void {
  const dir = getGlobalRunTrimDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getInstallStatePath(), JSON.stringify(state, null, 2), "utf-8");
}

function ensureInstallState(): InstallState {
  const raw = readInstallStateRaw();
  if (raw.exists && raw.state) return raw.state;
  const created: InstallState = {
    machineInstallId: randomId("rt_install"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  writeInstallState(created);
  return created;
}

function buildDefaultRegistry(install: InstallState): GlobalRunTrimRegistry {
  const base: Omit<GlobalRunTrimRegistry, "integrity"> = {
    version: 2,
    stateVersion: 2,
    plan: "free",
    machineInstallId: install.machineInstallId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    trackedRepos: [],
    lastKnownRepo: null,
    telemetry: { ...EMPTY_TELEMETRY },
  };
  return {
    ...base,
    integrity: {
      algorithm: "sha256-local-seal-v1",
      seal: computeSeal(base),
    },
  };
}

function saveRegistryWithSeal(registry: GlobalRunTrimRegistry): void {
  const dir = getGlobalRunTrimDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const normalizedBase: Omit<GlobalRunTrimRegistry, "integrity"> = {
    ...registry,
    version: 2,
    stateVersion: 2,
    trackedRepos: registry.trackedRepos.map((r) => ({ ...r, path: normalizeRepoPath(r.path) })),
    telemetry: registry.telemetry ?? { ...EMPTY_TELEMETRY },
  };
  const sealed: GlobalRunTrimRegistry = {
    ...normalizedBase,
    integrity: {
      algorithm: "sha256-local-seal-v1",
      seal: computeSeal(normalizedBase),
    },
  };
  fs.writeFileSync(getGlobalRegistryPath(), JSON.stringify(sealed, null, 2), "utf-8");
}

function inspectGlobalRegistry(): {
  registry: GlobalRunTrimRegistry;
  needsRepair: boolean;
  repairReason: string | null;
} {
  const installRaw = readInstallStateRaw();
  const install = installRaw.state ?? ensureInstallState();
  const registryPath = getGlobalRegistryPath();
  const defaultRegistry = buildDefaultRegistry(install);

  if (!fs.existsSync(registryPath)) {
    if (installRaw.exists) {
      return {
        registry: defaultRegistry,
        needsRepair: true,
        repairReason: "missing_registry_after_initialization",
      };
    }
    return { registry: defaultRegistry, needsRepair: false, repairReason: null };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8")) as Partial<GlobalRunTrimRegistry>;
    const trackedRepos = Array.isArray(raw.trackedRepos)
      ? raw.trackedRepos
          .map((item) => sanitizeTrackedRepoEntry(item as Partial<TrackedRepoEntry>))
          .filter((item): item is TrackedRepoEntry => Boolean(item))
      : [];
    const base: Omit<GlobalRunTrimRegistry, "integrity"> = {
      version: 2,
      stateVersion: 2,
      plan: parsePlan(raw.plan),
      machineInstallId: String(raw.machineInstallId ?? "").trim() || install.machineInstallId,
      createdAt: String(raw.createdAt ?? "").trim() || nowIso(),
      updatedAt: String(raw.updatedAt ?? "").trim() || nowIso(),
      trackedRepos,
      lastKnownRepo:
        raw.lastKnownRepo && typeof raw.lastKnownRepo === "object"
          ? {
              id: String((raw.lastKnownRepo as { id?: string }).id ?? "").trim(),
              name: String((raw.lastKnownRepo as { name?: string }).name ?? "").trim(),
              path: normalizeRepoPath(String((raw.lastKnownRepo as { path?: string }).path ?? "")),
              gitRemote: String((raw.lastKnownRepo as { gitRemote?: string }).gitRemote ?? "").trim(),
              lastSeenAt: String((raw.lastKnownRepo as { lastSeenAt?: string }).lastSeenAt ?? "").trim() || nowIso(),
            }
          : null,
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
    const normalized: GlobalRunTrimRegistry = {
      ...base,
      integrity: {
        algorithm: "sha256-local-seal-v1",
        seal:
          raw.integrity &&
          typeof raw.integrity === "object" &&
          typeof (raw.integrity as { seal?: string }).seal === "string"
            ? String((raw.integrity as { seal?: string }).seal)
            : "",
      },
    };

    if (normalized.machineInstallId !== install.machineInstallId) {
      return {
        registry: normalized,
        needsRepair: true,
        repairReason: "machine_install_id_mismatch",
      };
    }
    const expectedSeal = computeSeal(base);
    if (!normalized.integrity.seal || normalized.integrity.seal !== expectedSeal) {
      return {
        registry: normalized,
        needsRepair: true,
        repairReason: "integrity_seal_mismatch",
      };
    }
    return { registry: normalized, needsRepair: false, repairReason: null };
  } catch {
    return {
      registry: defaultRegistry,
      needsRepair: true,
      repairReason: "registry_corrupt",
    };
  }
}

export function loadGlobalRegistry(): GlobalRunTrimRegistry {
  return inspectGlobalRegistry().registry;
}

export function saveGlobalRegistry(registry: GlobalRunTrimRegistry): void {
  saveRegistryWithSeal(registry);
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
  const inspected = inspectGlobalRegistry();
  const registry = inspected.registry;
  const currentRepo = await getCurrentRepoIdentity(cwd);
  const trackedRepo = findTrackedRepo(registry.trackedRepos, currentRepo);
  const base = {
    plan: registry.plan,
    currentRepo,
    trackedRepo,
    registryPath: getGlobalRegistryPath(),
  };

  if (inspected.needsRepair) {
    return {
      ...base,
      allowed: false,
      status: "blocked_repair",
      repairRequired: true,
      repairReason: inspected.repairReason,
    };
  }

  if (registry.plan !== "free") {
    return {
      ...base,
      allowed: true,
      status: "allowed",
      repairRequired: false,
      repairReason: null,
    };
  }

  if (trackedRepo || registry.trackedRepos.length === 0) {
    return {
      ...base,
      allowed: true,
      status: "allowed",
      repairRequired: false,
      repairReason: null,
    };
  }

  return {
    ...base,
    allowed: false,
    status: "blocked_limit",
    repairRequired: false,
    repairReason: null,
    trackedRepo: registry.trackedRepos[0],
  };
}

export async function registerCurrentRepo(cwd = process.cwd()): Promise<TrackedRepoEntry> {
  const check = await assertFreeRepoAllowed(cwd);
  if (!check.allowed && check.status === "blocked_repair") {
    throw new Error("runtrim_local_state_repair_required");
  }

  const registry = loadGlobalRegistry();
  const currentRepo = await getCurrentRepoIdentity(cwd);
  const now = nowIso();
  const existing = findTrackedRepo(registry.trackedRepos, currentRepo);
  if (existing) {
    existing.lastSeenAt = now;
    existing.name = currentRepo.name;
    existing.path = currentRepo.path;
    existing.gitRemote = currentRepo.gitRemote;
    registry.updatedAt = now;
    registry.lastKnownRepo = {
      id: currentRepo.id,
      name: currentRepo.name,
      path: currentRepo.path,
      gitRemote: currentRepo.gitRemote,
      lastSeenAt: now,
    };
    saveRegistryWithSeal(registry);
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
  // Free: only one tracked repo at a time (replaces). Pro+: accumulate all tracked repos.
  registry.trackedRepos = registry.plan === "free" ? [entry] : [...registry.trackedRepos, entry];
  registry.updatedAt = now;
  registry.lastKnownRepo = {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    gitRemote: entry.gitRemote,
    lastSeenAt: now,
  };
  saveRegistryWithSeal(registry);
  return entry;
}

export async function repairGlobalRegistry(
  cwd = process.cwd(),
  options: { useCurrentRepo?: boolean } = {}
): Promise<{ repaired: boolean; check: FreeRepoLimitCheck }> {
  const before = await assertFreeRepoAllowed(cwd);
  if (!before.repairRequired) {
    return { repaired: false, check: before };
  }
  const install = ensureInstallState();
  const now = nowIso();
  const repaired = buildDefaultRegistry(install);
  repaired.createdAt = now;
  repaired.updatedAt = now;

  if (options.useCurrentRepo) {
    const currentRepo = await getCurrentRepoIdentity(cwd);
    repaired.trackedRepos = [
      {
        id: currentRepo.id,
        name: currentRepo.name,
        path: currentRepo.path,
        gitRemote: currentRepo.gitRemote,
        createdAt: now,
        lastSeenAt: now,
      },
    ];
    repaired.lastKnownRepo = {
      id: currentRepo.id,
      name: currentRepo.name,
      path: currentRepo.path,
      gitRemote: currentRepo.gitRemote,
      lastSeenAt: now,
    };
  }

  saveRegistryWithSeal(repaired);
  const check = await assertFreeRepoAllowed(cwd);
  return { repaired: true, check };
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
  const check = await assertFreeRepoAllowed(cwd);
  if (check.status === "blocked_repair") {
    if (!force) {
      return {
        removed: false,
        forced: false,
        currentRepo: check.currentRepo,
        trackedRepo: null,
      };
    }
    const install = ensureInstallState();
    const repaired = buildDefaultRegistry(install);
    repaired.updatedAt = nowIso();
    repaired.lastKnownRepo = {
      id: check.currentRepo.id,
      name: check.currentRepo.name,
      path: check.currentRepo.path,
      gitRemote: check.currentRepo.gitRemote,
      lastSeenAt: repaired.updatedAt,
    };
    saveRegistryWithSeal(repaired);
    return {
      removed: true,
      forced: true,
      currentRepo: check.currentRepo,
      trackedRepo: null,
    };
  }

  const registry = loadGlobalRegistry();
  const currentRepo = await getCurrentRepoIdentity(cwd);
  const trackedRepo = findTrackedRepo(registry.trackedRepos, currentRepo);
  if (trackedRepo) {
    registry.trackedRepos = registry.trackedRepos.filter((repo) => repo.id !== trackedRepo.id);
    registry.updatedAt = nowIso();
    registry.lastKnownRepo = {
      id: trackedRepo.id,
      name: trackedRepo.name,
      path: trackedRepo.path,
      gitRemote: trackedRepo.gitRemote,
      lastSeenAt: registry.updatedAt,
    };
    saveRegistryWithSeal(registry);
    return { removed: true, forced: false, currentRepo, trackedRepo };
  }

  if (force && registry.trackedRepos.length > 0) {
    const first = registry.trackedRepos[0];
    registry.trackedRepos = [];
    registry.updatedAt = nowIso();
    registry.lastKnownRepo = {
      id: first.id,
      name: first.name,
      path: first.path,
      gitRemote: first.gitRemote,
      lastSeenAt: registry.updatedAt,
    };
    saveRegistryWithSeal(registry);
    return { removed: true, forced: true, currentRepo, trackedRepo: first };
  }

  return {
    removed: false,
    forced: false,
    currentRepo,
    trackedRepo: registry.trackedRepos[0] ?? null,
  };
}

/** Returns true if a path is in a system temp directory and should not be permanently tracked. */
export function isTempPath(p: string): boolean {
  const normalized = p.toLowerCase().replace(/\\/g, "/");
  const tmpDir = (os.tmpdir() ?? "").toLowerCase().replace(/\\/g, "/");
  if (tmpDir && normalized.startsWith(tmpDir)) return true;
  const tempSegments = ["/tmp/", "/temp/", "appdata/local/temp/", "appdata\\local\\temp\\"];
  return tempSegments.some((s) => normalized.includes(s.replace(/\\/g, "/")));
}

/** Write a new plan into the global registry (called after CLI login to sync plan from server). */
export function writePlanToRegistry(plan: RunTrimPlan): void {
  const registry = loadGlobalRegistry();
  if (registry.plan === plan) return; // no-op if already correct
  registry.plan = plan;
  registry.updatedAt = nowIso();
  saveRegistryWithSeal(registry);
}
