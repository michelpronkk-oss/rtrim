"use client";

import { CopyButton } from "@/components/app/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InspectorRun = {
  localId: string;
  task: string;
  status: string;
  createdAt: string | null;
  riskBefore: string | null;
  riskAfter: string | null;
  scoreAfter: number | null;
  changedFiles: string[];
  missingProofItems: string[];
  watchWarnings: string[];
  detectedRisks: string[];
  sensitiveAreas: string[];
};

interface RunsInspectorProps {
  run: InspectorRun;
  promptLabel: string;
  promptText: string;
}

export function RunsInspector({ run, promptLabel, promptText }: RunsInspectorProps) {
  const nextAction = promptText
    ? "Use the next safe prompt and keep scope contained."
    : "Run runtrim check, then runtrim sync.";

  return (
    <div className="divide-y divide-white/8">
      <div className="px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Run inspector</p>
      </div>
      <div className="px-5 py-4">
        <Tabs defaultValue="summary">
          <TabsList variant="line" className="w-full justify-start border-b border-white/8 p-0">
            <TabsTrigger value="summary" className="px-3 py-2 text-[12px]">Summary</TabsTrigger>
            <TabsTrigger value="prompt" className="px-3 py-2 text-[12px]">Prompt</TabsTrigger>
            <TabsTrigger value="verification" className="px-3 py-2 text-[12px]">Verification</TabsTrigger>
            <TabsTrigger value="metadata" className="px-3 py-2 text-[12px]">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="pt-4">
            <p className="font-mono text-[10px] uppercase text-[#4D5070]">Task</p>
            <p className="mt-1.5 text-[13px] leading-5 text-[#C0C2E8]">{run.task}</p>
            <div className="mt-4 grid grid-cols-2 gap-px rounded-lg border border-white/8 bg-white/8">
              <div className="bg-[#0D0C22] px-4 py-3">
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Score</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-[#9E91FF]">{run.scoreAfter ?? "n/a"}</p>
              </div>
              <div className="bg-[#0D0C22] px-4 py-3">
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Files changed</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-[#EDEEFF]">{run.changedFiles.length}</p>
              </div>
              <div className="bg-[#0D0C22] px-4 py-3">
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Proof missing</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${run.missingProofItems.length > 0 ? "text-[#F0BF72]" : "text-[#4DE8B0]"}`}>{run.missingProofItems.length}</p>
              </div>
              <div className="bg-[#0D0C22] px-4 py-3">
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Warnings</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${run.watchWarnings.length > 0 ? "text-[#FF7B5C]" : "text-[#EDEEFF]"}`}>{run.watchWarnings.length}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-[#090918] p-3">
              <p className="font-mono text-[10px] uppercase text-[#4D5070]">Next safe action</p>
              <p className="mt-1.5 text-[12px] leading-5 text-[#C0C2E8]">{nextAction}</p>
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase text-[#4D5070]">{promptLabel}</p>
              <CopyButton text={promptText} />
            </div>
            <div className="max-h-[320px] overflow-auto rounded-lg border border-white/8 bg-[#090918] p-3">
              <p className="font-mono text-[12px] leading-6 text-[#C0C2E8] whitespace-pre-wrap">
                {promptText || "No prompt synced yet. Run `runtrim prepare` and `runtrim sync`."}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="verification" className="pt-4">
            <p className="font-mono text-[10px] uppercase text-[#4D5070]">Missing proof items</p>
            <ul className="mt-2 space-y-1">
              {run.missingProofItems.length > 0
                ? run.missingProofItems.map((item) => (
                    <li key={item} className="text-[12px] text-[#F0BF72]">{item}</li>
                  ))
                : <li className="text-[12px] text-[#4DE8B0]">No open proof items.</li>}
            </ul>
            <p className="mt-4 font-mono text-[10px] uppercase text-[#4D5070]">Watch warnings</p>
            <ul className="mt-2 space-y-1">
              {run.watchWarnings.length > 0
                ? run.watchWarnings.map((warning) => (
                    <li key={warning} className="text-[12px] text-[#FF7B5C]">{warning}</li>
                  ))
                : <li className="text-[12px] text-[#C0C2E8]">No warnings recorded.</li>}
            </ul>
          </TabsContent>

          <TabsContent value="metadata" className="pt-4">
            <div className="space-y-3 text-[12px] text-[#C0C2E8]">
              <div>
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Run id</p>
                <p className="mt-1">{run.localId}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Created</p>
                <p className="mt-1">{run.createdAt ?? "Unknown"}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Risk transition</p>
                <p className="mt-1">{(run.riskBefore ?? "unknown").toUpperCase()}{run.riskAfter ? ` -> ${run.riskAfter.toUpperCase()}` : ""}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Detected risks</p>
                <p className="mt-1">{run.detectedRisks.length > 0 ? run.detectedRisks.join(", ") : "None recorded"}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-[#4D5070]">Sensitive areas</p>
                <p className="mt-1">{run.sensitiveAreas.length > 0 ? run.sensitiveAreas.join(", ") : "None recorded"}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
