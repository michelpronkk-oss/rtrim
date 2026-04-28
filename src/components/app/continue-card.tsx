import { CopyButton } from "./copy-button";
import { RunStatusBadge } from "./run-status-badge";

interface ContinueCardProps {
  project: string;
  status: string;
  lastUpdated: string;
  syncState: string;
  currentFocus: string;
  nextSafeAction: string;
  lastTask: string;
  changedFilesCount: number;
  missingProofItems: string[];
  detectedRiskSystems: string[];
  nextSafePrompt: string;
}

export function ContinueCard(props: ContinueCardProps) {
  const {
    project,
    status,
    lastUpdated,
    syncState,
    currentFocus,
    nextSafeAction,
    lastTask,
    changedFilesCount,
    missingProofItems,
    detectedRiskSystems,
    nextSafePrompt,
  } = props;

  return (
    <section className="surface-panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Continue where you left off</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#F5F7FA]">{project}</h2>
          <p className="mt-1 text-[13px] text-[#9AA7B6]">{currentFocus}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RunStatusBadge status={status} />
          <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] text-[#A5B1BF]">{syncState}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Last updated</p>
          <p className="mt-1 text-[13px] text-[#D7DEE7]">{lastUpdated}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Changed files</p>
          <p className="mt-1 text-[13px] text-[#D7DEE7]">{changedFilesCount} files in latest run</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Verification debt</p>
          <p className="mt-1 text-[13px] text-[#D7DEE7]">{missingProofItems.length} open proof items</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
          <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Next safe action</p>
          <p className="mt-1 text-[13px] text-[#D7DEE7]">{nextSafeAction}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/8 bg-[#0E151E] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.09em] text-[#6D7B8C]">Last task</p>
        <p className="mt-1 text-[13px] text-[#D7DEE7]">{lastTask}</p>
        {detectedRiskSystems.length > 0 ? (
          <p className="mt-2 text-[12px] text-[#9AA7B6]">Detected risk systems: {detectedRiskSystems.join(", ")}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-white/8 bg-[#0E151E] p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.09em] text-[#6D7B8C]">Next safe prompt preview</p>
          <CopyButton text={nextSafePrompt} label="Copy prompt" />
        </div>
        <p className="line-clamp-4 text-[13px] leading-6 text-[#D7DEE7]">{nextSafePrompt || "No prompt yet. Run runtrim check or runtrim memory --prompt."}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-[#9AA7B6]">
          <span className="rounded-md border border-white/10 px-2 py-1 font-mono">runtrim memory --prompt</span>
          <span className="rounded-md border border-white/10 px-2 py-1 font-mono">runtrim sync</span>
        </div>
      </div>
    </section>
  );
}
