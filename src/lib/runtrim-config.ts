import fs from "fs";
import path from "path";
import { z } from "zod";

export const ConfigSchema = z.object({
  defaultAgent: z.enum(["claude", "codex", "cursor", "chatgpt", "custom"]).default("claude"),
  defaultModel: z.enum(["sonnet", "opus", "haiku", "gpt-4o", "gpt-4o-mini", "o1", "o3-mini"]).default("sonnet"),
  stack: z.string().default("auto"),
  monthlyAiSpend: z.number().default(100),
  riskSensitivity: z.enum(["low", "standard", "high"]).default("standard"),
  sensitiveAreas: z
    .array(z.string())
    .default(["auth", "billing", "middleware", "database", "env", "payments", "webhooks"]),
  maxFilesPerRun: z.number().default(5),
  auditFirst: z.boolean().default(true),
  agentMode: z.enum(["copy", "command"]).default("copy"),
  agentCommand: z.string().default("claude"),
  agentArgs: z.array(z.string()).default([]),
  agentPromptMode: z.enum(["argument", "stdin"]).default("argument"),
  preferredEditor: z.string().default("code"),
  lastPromptPath: z.string().default(".runtrim/latest-prompt.md"),
  dashboardUrl: z.string().default("http://localhost:3000/app"),
  syncToken: z.string().optional(),
  syncEnabled: z.boolean().default(false),
  baselineInitialized: z.boolean().default(false),
  lastAuditAt: z.string().optional(),
  packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]).default("npm"),
  lastContinuationReason: z.string().optional(),
  continuationPromptPath: z.string().optional(),
  continuationCreatedAt: z.string().optional(),
  telemetry: z
    .object({
      enabled: z.boolean().default(false),
      promptedAt: z.string().optional(),
    })
    .default({ enabled: false }),
  /** Auto-guard mode: smart | strict | fast | off. Default: smart. */
  autoGuardMode: z.enum(["smart", "strict", "fast", "off"]).default("smart"),
});

export type RunTrimConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: RunTrimConfig = {
  defaultAgent: "claude",
  defaultModel: "sonnet",
  stack: "auto",
  monthlyAiSpend: 100,
  riskSensitivity: "standard",
  sensitiveAreas: ["auth", "billing", "middleware", "database", "env", "payments", "webhooks"],
  maxFilesPerRun: 5,
  auditFirst: true,
  syncEnabled: false,
  agentMode: "copy",
  agentCommand: "claude",
  agentArgs: [],
  agentPromptMode: "argument",
  preferredEditor: "code",
  lastPromptPath: ".runtrim/latest-prompt.md",
  dashboardUrl: "http://localhost:3000/app",
  baselineInitialized: false,
  packageManager: "npm",
  telemetry: {
    enabled: false,
  },
  autoGuardMode: "smart" as const,
};

export function getConfigDir(cwd = process.cwd()): string {
  return path.join(cwd, ".runtrim");
}

export function getConfigPath(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "config.json");
}

export function getRunsDir(cwd = process.cwd()): string {
  return path.join(getInternalDir(cwd), "runs");
}

export function getLegacyRunsDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "runs");
}

export function getInternalDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "internal");
}

export function getPreviewsDir(cwd = process.cwd()): string {
  return path.join(getInternalDir(cwd), "previews");
}

export function getLegacyPreviewsDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "previews");
}

export function getRestoresDir(cwd = process.cwd()): string {
  return path.join(getInternalDir(cwd), "restores");
}

export function getLegacyRestoresDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "restores");
}

export function getContractsArchiveDir(cwd = process.cwd()): string {
  return path.join(getInternalDir(cwd), "contracts-archive");
}

export function getLegacyContractsArchiveDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "contracts", "archive");
}

export function getAgentArchiveDir(cwd = process.cwd()): string {
  return path.join(getInternalDir(cwd), "agent-archive");
}

export function getLegacyAgentDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "agent");
}

export function ensureInternalArtifactDirs(cwd = process.cwd()): void {
  const dirs = [
    getInternalDir(cwd),
    getRunsDir(cwd),
    getPreviewsDir(cwd),
    getRestoresDir(cwd),
    getContractsArchiveDir(cwd),
    getAgentArchiveDir(cwd),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function configExists(cwd = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(cwd));
}

export function loadConfig(cwd = process.cwd()): RunTrimConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return ConfigSchema.parse({ ...DEFAULT_CONFIG, ...raw });
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: RunTrimConfig, cwd = process.cwd()): void {
  const dir = getConfigDir(cwd);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(cwd), JSON.stringify(config, null, 2));
}

export function detectProjectInfo(cwd = process.cwd()): Partial<RunTrimConfig> {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const stackHints: string[] = [];
    if (deps["next"]) stackHints.push("nextjs");
    if (deps["@supabase/supabase-js"] || deps["supabase"]) stackHints.push("supabase");
    if (deps["stripe"]) stackHints.push("stripe");
    if (deps["@shopify/shopify-api"] || deps["@shopify/hydrogen"]) stackHints.push("shopify");
    if (deps["prisma"] || deps["@prisma/client"]) stackHints.push("prisma");
    if (deps["drizzle-orm"]) stackHints.push("drizzle");
    if (stackHints.length > 0) return { stack: stackHints.join(",") };
  } catch {
    // ignore
  }
  return {};
}
