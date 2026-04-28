import { CopyButton } from "./copy-button";
import { Lock, AlertTriangle, Check } from "lucide-react";

interface ProjectMemoryPanelProps {
  currentFocus: string;
  protectedAreas: string[];
  stillMissing: string[];
  nextPrompt: string;
}

export function ProjectMemoryPanel({ currentFocus, protectedAreas, stillMissing, nextPrompt }: ProjectMemoryPanelProps) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Project memory</p>
        <code className="font-mono text-[10px] text-[#2E2E50]">.runtrim/memory.md</code>
      </div>

      <p className="mt-3 text-[13px] leading-5 text-[#C0C2E8]">{currentFocus}</p>

      <div className="mt-4 space-y-2.5">
        {/* Protected areas */}
        <div className="rounded-lg border border-white/8 bg-[#090918] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Lock className="size-3 text-[#4D5070]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Protected systems</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {protectedAreas.map((p) => (
              <span key={p} className="rounded border border-white/8 px-2 py-0.5 font-mono text-[11px] text-[#6870A0]">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Missing proof */}
        <div className="rounded-lg border border-white/8 bg-[#090918] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            {stillMissing.length > 0
              ? <AlertTriangle className="size-3 text-[#F0BF72]" />
              : <Check className="size-3 text-[#4DE8B0]" />
            }
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Verification debt</p>
          </div>
          {stillMissing.length > 0 ? (
            <ul className="space-y-0.5">
              {stillMissing.map((m) => (
                <li key={m} className="text-[12px] text-[#F0BF72]">{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-[#4DE8B0]">No open proof items.</p>
          )}
        </div>

        {/* Next prompt */}
        <div className="rounded-lg border border-white/8 bg-[#090918] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Next safe prompt</p>
            <CopyButton text={nextPrompt} />
          </div>
          <p className="line-clamp-3 text-[12px] leading-5 text-[#C0C2E8]">
            {nextPrompt || "No prompt yet. Run runtrim check or runtrim memory --prompt."}
          </p>
        </div>
      </div>
    </section>
  );
}
