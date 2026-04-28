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
  syncEnabled: z.boolean().default(false),
  agentMode: z.enum(["copy", "command"]).default("copy"),
  agentCommand: z.string().default("claude"),
  agentArgs: z.array(z.string()).default([]),
  agentPromptMode: z.enum(["argument", "stdin"]).default("argument"),
  preferredEditor: z.string().default("code"),
  lastPromptPath: z.string().default(".runtrim/latest-prompt.md"),
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
};

export function getConfigDir(cwd = process.cwd()): string {
  return path.join(cwd, ".runtrim");
}

export function getConfigPath(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "config.json");
}

export function getRunsDir(cwd = process.cwd()): string {
  return path.join(getConfigDir(cwd), "runs");
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
