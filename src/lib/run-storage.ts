import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { AuditResult } from "./run-audit";
import type { ContractResult } from "./run-contract";
import type { EvaluationResult } from "./run-evaluation";
import type { ProviderRoutingDecision } from "./provider-routing";
import { getLegacyRunsDir, getRunsDir } from "./runtrim-config";

export interface AgentExecutionRecord {
  mode: "copy" | "command";
  command: string;
  args: string[];
  promptMode: "argument" | "stdin";
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  exitCode?: number;
  stdoutPreview?: string;
  stderrPreview?: string;
  outputPath?: string;
}

export interface RunEvaluationRecord extends EvaluationResult {
  nextPrompt: string;
  nextSafePrompt?: string;
  nextSafeAction: string;
  memorySummary: string;
  evaluatedAt: string;
}

export interface WatchEventRecord {
  type: "forbidden_changed" | "sensitive_changed" | "file_limit_exceeded" | "summary";
  files: string[];
  createdAt: string;
  severity: "info" | "warning" | "critical";
}

export interface RunRecord {
  id: string;
  createdAt: string;
  task: string;
  audit: AuditResult;
  contract: ContractResult;
  agentExecution?: AgentExecutionRecord;
  evaluation?: RunEvaluationRecord;
  watchEvents?: WatchEventRecord[];
  watchStatus?: "safe" | "caution" | "drift_detected" | "limit_exceeded";
  watchWarnings?: string[];
  watchChangedFiles?: string[];
  checkSummary?: {
    checkedAt: string;
    changedFilesCount: number;
    allowedCount: number;
    sensitiveCount: number;
    forbiddenCount: number;
    outsideScopeCount: number;
    verificationDebt: string[];
    riskFlags: string[];
    nextSafeAction: string;
  };
  status:
    | "guarded"
    | "checked"
    | "completed"
    | "blocked"
    | "split_required"
    | "executed";
  // Bridge Mode fields (set by runtrim go / runtrim finish)
  bridgeMode?: boolean;
  tokenBudget?: number;
  memorySummary?: string;
  memoryUsed?: boolean;
  reportSummary?: string;
  scopeDriftStatus?: string;
  pendingSync?: boolean;
  providerRouting?: ProviderRoutingDecision;
  controlledExecutionId?: string;
  controlledExecutionStatus?: "pending" | "blocked" | "ready-for-agent" | "split-required" | "completed";
  /** Relative paths of files written/appended by RunTrim during this session. */
  bridgeManagedFiles?: string[];
}

export function saveRun(
  task: string,
  audit: AuditResult,
  contract: ContractResult,
  cwd = process.cwd()
): RunRecord {
  const runsDir = getRunsDir(cwd);
  if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });

  const record: RunRecord = {
    id: nanoid(8),
    createdAt: new Date().toISOString(),
    task,
    audit,
    contract,
    status: "guarded",
  };

  fs.writeFileSync(
    path.join(runsDir, `${record.id}.json`),
    JSON.stringify(record, null, 2)
  );

  return record;
}

export function loadLatestRun(cwd = process.cwd()): RunRecord | null {
  const candidateDirs = [getRunsDir(cwd), getLegacyRunsDir(cwd)].filter((dir, idx, arr) => arr.indexOf(dir) === idx);
  const files = candidateDirs
    .filter((dir) => fs.existsSync(dir))
    .flatMap((dir) =>
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => ({
          dir,
          name: f,
          time: fs.statSync(path.join(dir, f)).mtime.getTime(),
        }))
    )
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) return null;

  try {
    return JSON.parse(
      fs.readFileSync(path.join(files[0].dir, files[0].name), "utf-8")
    ) as RunRecord;
  } catch {
    return null;
  }
}

export function updateRun(
  runId: string,
  updates: Partial<RunRecord>,
  cwd = process.cwd()
): void {
  const preferredPath = path.join(getRunsDir(cwd), `${runId}.json`);
  const legacyPath = path.join(getLegacyRunsDir(cwd), `${runId}.json`);
  const filePath = fs.existsSync(preferredPath) ? preferredPath : legacyPath;
  if (!fs.existsSync(filePath)) return;
  const existing = JSON.parse(fs.readFileSync(filePath, "utf-8")) as RunRecord;
  fs.writeFileSync(filePath, JSON.stringify({ ...existing, ...updates }, null, 2));
}

export function loadAllRuns(cwd = process.cwd()): RunRecord[] {
  const candidateDirs = [getRunsDir(cwd), getLegacyRunsDir(cwd)].filter((dir, idx, arr) => arr.indexOf(dir) === idx);
  const files = candidateDirs
    .filter((dir) => fs.existsSync(dir))
    .flatMap((dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f)));
  const deduped = [...new Set(files)];

  return deduped
    .map((filePath) => {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8")) as RunRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is RunRecord => r !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}
