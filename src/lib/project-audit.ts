import fs from "fs";
import path from "path";
import { getConfigDir } from "./runtrim-config";

export type RiskSurfaceType =
  | "auth"
  | "middleware"
  | "database"
  | "billing"
  | "payments"
  | "webhooks"
  | "env/secrets"
  | "api routes"
  | "migrations"
  | "config"
  | "package scripts";

export interface RiskSurface {
  type: RiskSurfaceType;
  paths: string[];
  defaultPolicy: string;
}

export interface BaselineProjectAudit {
  projectName: string;
  detectedStack: string[];
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  scripts: Record<string, string>;
  riskSurfaces: RiskSurface[];
  protectedAreas: string[];
  recommendedFirstAction: string;
  createdAt: string;
  updatedAt: string;
}

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "dist-cli",
  "coverage",
  ".vercel",
  ".turbo",
  ".runtrim",
]);

const ENV_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
]);

export function getProjectAuditPath(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "project-audit.json");
}

export function getRulesPath(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "rules.md");
}

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

function safeReadPackageJson(cwd: string): {
  name?: string;
  scripts: Record<string, string>;
  deps: Record<string, string>;
} {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return { scripts: {}, deps: {} };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
      name?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      name: pkg.name,
      scripts: pkg.scripts ?? {},
      deps: { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) },
    };
  } catch {
    return { scripts: {}, deps: {} };
  }
}

function scanPaths(cwd: string): string[] {
  const out: string[] = [];
  function walk(dir: string, rel: string): void {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name), entryRel);
      } else {
        out.push(toPosix(entryRel));
      }
    }
  }
  walk(cwd, "");
  return out;
}

function detectPackageManager(cwd: string): "npm" | "pnpm" | "yarn" | "bun" {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  return "npm";
}

function hasPrefix(paths: string[], prefix: string): boolean {
  return paths.some((p) => p === prefix || p.startsWith(prefix + "/"));
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)];
}

function detectStack(deps: Record<string, string>, paths: string[]): string[] {
  const stack: string[] = [];
  if (deps.next) stack.push("nextjs");
  if (hasPrefix(paths, "src/app") || hasPrefix(paths, "app")) stack.push("app-router");
  if (hasPrefix(paths, "pages") || hasPrefix(paths, "src/pages")) stack.push("pages-router");
  if (deps.react) stack.push("react");
  stack.push("node");
  if (deps.typescript || paths.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"))) stack.push("typescript");
  if (deps.tailwindcss || paths.some((p) => p.includes("tailwind.config"))) stack.push("tailwind");
  if (deps["@supabase/supabase-js"] || hasPrefix(paths, "supabase")) stack.push("supabase");
  if (deps.prisma || deps["@prisma/client"] || hasPrefix(paths, "prisma")) stack.push("prisma");
  if (deps.vercel || hasPrefix(paths, ".vercel")) stack.push("vercel");
  if (deps["@shopify/shopify-api"] || deps["@shopify/hydrogen"]) stack.push("shopify");
  if (deps.stripe || paths.some((p) => p.toLowerCase().includes("stripe"))) stack.push("stripe");
  if (paths.some((p) => p.toLowerCase().includes("dodo"))) stack.push("dodo");
  if (deps["@trpc/server"] || deps["@trpc/client"] || paths.some((p) => p.toLowerCase().includes("trpc"))) stack.push("trpc");
  if (deps["drizzle-orm"] || paths.some((p) => p.toLowerCase().includes("drizzle"))) stack.push("drizzle");
  if (deps["@clerk/nextjs"] || deps["@clerk/clerk-sdk-node"]) stack.push("clerk");
  if (deps["next-auth"] || deps["@auth/core"] || deps["@auth/nextjs"]) stack.push("nextauth");
  return uniq(stack);
}

function addSurface(
  acc: Map<RiskSurfaceType, RiskSurface>,
  type: RiskSurfaceType,
  matchPaths: string[],
  policy: string
): void {
  const existing = acc.get(type);
  if (!existing) {
    acc.set(type, { type, paths: uniq(matchPaths), defaultPolicy: policy });
    return;
  }
  existing.paths = uniq([...existing.paths, ...matchPaths]);
}

function detectRiskSurfaces(paths: string[]): RiskSurface[] {
  const surfaces = new Map<RiskSurfaceType, RiskSurface>();
  const lower = (p: string) => p.toLowerCase();

  const authPaths = paths.filter((p) => /(auth|login|callback|session)/i.test(p));
  if (authPaths.length) addSurface(surfaces, "auth", authPaths, "audit-first");

  const middlewarePaths = paths.filter((p) => /^middleware\.(ts|js)$/.test(p) || /\/middleware\.(ts|js)$/.test(p));
  if (middlewarePaths.length) addSurface(surfaces, "middleware", middlewarePaths, "audit-first");

  const dbPaths = paths.filter((p) => /(prisma|drizzle|database|schema)/i.test(p));
  if (dbPaths.length) addSurface(surfaces, "database", dbPaths, "audit-first");

  const migrationPaths = paths.filter((p) => /(migration|migrations|seed)/i.test(p));
  if (migrationPaths.length) addSurface(surfaces, "migrations", migrationPaths, "audit-first");

  const billingPaths = paths.filter((p) => /(billing|subscription)/i.test(p));
  if (billingPaths.length) addSurface(surfaces, "billing", billingPaths, "sensitive, approval-before-editing");

  const paymentPaths = paths.filter((p) => /(payment|stripe|dodo|checkout)/i.test(p));
  if (paymentPaths.length) addSurface(surfaces, "payments", paymentPaths, "sensitive, approval-before-editing");

  const webhookPaths = paths.filter((p) => /(webhook|webhooks)/i.test(p));
  if (webhookPaths.length) addSurface(surfaces, "webhooks", webhookPaths, "sensitive, approval-before-editing");

  const envPaths = paths.filter((p) => ENV_FILENAMES.has(path.basename(p)));
  if (envPaths.length) addSurface(surfaces, "env/secrets", envPaths, "filename-detect-only, never-read");

  const apiPaths = paths.filter((p) => /(^|\/)(app\/api|src\/app\/api|pages\/api|src\/pages\/api)(\/|$)/i.test(p));
  if (apiPaths.length) addSurface(surfaces, "api routes", uniq(apiPaths.map((p) => p.split("/").slice(0, 3).join("/"))), "scoped-review");

  const configPaths = paths.filter((p) =>
    /(next\.config|tsconfig|eslint|prettier|postcss|tailwind\.config|package\.json|components\.json)/i.test(lower(p))
  );
  if (configPaths.length) addSurface(surfaces, "config", configPaths, "approval-before-editing");

  addSurface(surfaces, "package scripts", ["package.json:scripts"], "inspect-before-changing");

  return [...surfaces.values()].sort((a, b) => a.type.localeCompare(b.type));
}

export function buildRulesMarkdown(audit: BaselineProjectAudit): string {
  const lines = [
    "# RunTrim Project Rules",
    "",
    "- Start audit-only for auth, middleware, database, billing, payments and webhooks.",
    "- Do not read or modify env files or secrets.",
    "- Do not touch more than 5 files without approval.",
    "- Identify root cause before editing.",
    "- Always return files changed and verification steps.",
    "- If scope expands, stop and ask.",
    "- Treat payment, subscription and webhook logic as sensitive.",
    "- Treat package, config and dependency changes as approval-required.",
  ];

  const sensitive = audit.riskSurfaces.filter((s) =>
    ["middleware", "api routes", "env/secrets", "auth", "database", "billing", "payments", "webhooks"].includes(s.type)
  );
  if (sensitive.length) {
    lines.push("", "## Detected sensitive surfaces");
    for (const s of sensitive) {
      lines.push(`- ${s.type}: ${s.paths.slice(0, 4).join(", ")}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function buildBaselineMemoryMarkdown(audit: BaselineProjectAudit): string {
  return [
    "RunTrim Project Memory",
    "",
    `Project: ${audit.projectName}`,
    `Stack: ${audit.detectedStack.join(", ") || "unknown"}`,
    `Last updated: ${new Date(audit.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}`,
    "",
    "Current state:",
    "Baseline initialized. No guarded runs yet.",
    "",
    "Detected stack:",
    ...(audit.detectedStack.length ? audit.detectedStack.map((s) => `- ${s}`) : ["- unknown"]),
    "",
    "Risk surfaces:",
    ...audit.riskSurfaces.map((s) => `- ${s.type}: ${s.defaultPolicy}`),
    "",
    "Protected areas:",
    ...audit.protectedAreas.map((p) => `- ${p}`),
    "",
    "Project rules:",
    "- Start audit-only for auth, middleware, database, billing, payments and webhooks.",
    "- Do not read or modify env files or secrets.",
    "- Do not touch more than 5 files without approval.",
    "- Identify root cause before editing.",
    "- Always return files changed and verification steps.",
    "",
    "Next safe action:",
    "Prepare the first AI coding run before opening Claude, Codex or Cursor.",
    "",
    "Next safe prompt:",
    "Run:",
    "runtrim prepare \"describe your next AI coding task\"",
    "",
    "Recent run summary:",
    "No guarded runs yet.",
    "",
  ].join("\n");
}

export function buildStarterPrompt(): string {
  return [
    "RUNTRIM FIRST RUN",
    "",
    "This project has been initialized with RunTrim.",
    "",
    "Before asking Claude, Codex or Cursor to edit code, prepare the task with:",
    "",
    "runtrim prepare \"describe your next AI coding task\"",
    "",
    "RunTrim will:",
    "- audit the task",
    "- detect risky scope",
    "- block unsafe mega-runs",
    "- create a guarded run contract",
    "- save the prompt here",
    "",
    "Protected by default:",
    "- auth",
    "- middleware",
    "- database schema",
    "- env/secrets",
    "- billing",
    "- payments",
    "- webhooks",
    "",
    "Do not use em dashes in generated prompt files.",
    "Keep this file ASCII-safe.",
    "",
  ].join("\n");
}

export function loadProjectAudit(cwd = process.cwd()): BaselineProjectAudit | null {
  const p = getProjectAuditPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as BaselineProjectAudit;
  } catch {
    return null;
  }
}

export function writeProjectAudit(audit: BaselineProjectAudit, cwd = process.cwd()): void {
  const p = getProjectAuditPath(cwd);
  fs.writeFileSync(p, JSON.stringify(audit, null, 2), "utf-8");
}

export function writeRules(audit: BaselineProjectAudit, cwd = process.cwd()): void {
  fs.writeFileSync(getRulesPath(cwd), buildRulesMarkdown(audit), "utf-8");
}

export function ensureStarterPromptIfMissing(cwd = process.cwd()): boolean {
  const promptPath = path.join(getConfigDir(cwd), "latest-prompt.md");
  if (fs.existsSync(promptPath)) return false;
  fs.writeFileSync(promptPath, buildStarterPrompt(), "utf-8");
  return true;
}

export function performBaselineProjectAudit(cwd = process.cwd(), previous?: BaselineProjectAudit | null): BaselineProjectAudit {
  const pkg = safeReadPackageJson(cwd);
  const allPaths = scanPaths(cwd);
  const now = new Date().toISOString();
  const projectName = pkg.name || path.basename(cwd);
  const packageManager = detectPackageManager(cwd);
  const detectedStack = detectStack(pkg.deps, allPaths);
  const scripts: Record<string, string> = {};
  for (const key of ["dev", "build", "lint", "test", "typecheck", "format", "preview"]) {
    if (pkg.scripts[key]) scripts[key] = pkg.scripts[key];
  }
  const riskSurfaces = detectRiskSurfaces(allPaths);
  const protectedAreas = [
    "auth",
    "middleware",
    "database schema",
    "env/secrets",
    "billing",
    "payments",
    "webhooks",
    "migrations",
    "package/config changes",
  ];
  return {
    projectName,
    detectedStack,
    packageManager,
    scripts,
    riskSurfaces,
    protectedAreas,
    recommendedFirstAction:
      "Run `runtrim prepare \"describe your next AI coding task\"` before opening Claude, Codex or Cursor.",
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

