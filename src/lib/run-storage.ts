import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { AuditResult } from "./run-audit";
import type { ContractResult } from "./run-contract";
import type { EvaluationResult } from "./run-evaluation";
import { getRunsDir } from "./runtrim-config";

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
}

export interface RunRecord {
  id: string;
  createdAt: string;
  task: string;
  audit: AuditResult;
  contract: ContractResult;
  agentExecution?: AgentExecutionRecord;
  evaluation?: RunEvaluationRecord;
  status:
    | "guarded"
    | "checked"
    | "completed"
    | "blocked"
    | "split_required"
    | "executed";
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
  const runsDir = getRunsDir(cwd);
  if (!fs.existsSync(runsDir)) return null;

  const files = fs
    .readdirSync(runsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(runsDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) return null;

  try {
    return JSON.parse(
      fs.readFileSync(path.join(runsDir, files[0].name), "utf-8")
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
  const filePath = path.join(getRunsDir(cwd), `${runId}.json`);
  if (!fs.existsSync(filePath)) return;
  const existing = JSON.parse(fs.readFileSync(filePath, "utf-8")) as RunRecord;
  fs.writeFileSync(filePath, JSON.stringify({ ...existing, ...updates }, null, 2));
}

export function loadAllRuns(cwd = process.cwd()): RunRecord[] {
  const runsDir = getRunsDir(cwd);
  if (!fs.existsSync(runsDir)) return [];

  return fs
    .readdirSync(runsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(
          fs.readFileSync(path.join(runsDir, f), "utf-8")
        ) as RunRecord;
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
