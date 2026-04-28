import { CopyButton } from "./copy-button";

interface ProjectMemoryPanelProps {
  currentFocus: string;
  protectedAreas: string[];
  stillMissing: string[];
  nextPrompt: string;
}

export function ProjectMemoryPanel({ currentFocus, protectedAreas, stillMissing, nextPrompt }: ProjectMemoryPanelProps) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Project memory</p>
      <p className="mt-2 text-[13px] text-[#D7DEE7]">{currentFocus}</p>
      <p className="mt-2 font-mono text-[11px] text-[#7D8A99]">Local file: .runtrim/memory.md</p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
          <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Protected areas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {protectedAreas.map((p) => (
              <span key={p} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#B8C7D7]">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
          <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Still missing</p>
          {stillMissing.length ? (
            <ul className="mt-2 space-y-1 text-[12px] text-[#F0BF72]">
              {stillMissing.map((m) => (
                <li key={m}>- {m}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-[#9AEFE3]">No open proof items recorded.</p>
          )}
        </div>

        <div className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase text-[#6D7B8C]">Next prompt</p>
            <CopyButton text={nextPrompt} />
          </div>
          <p className="mt-2 line-clamp-4 text-[12px] leading-6 text-[#D7DEE7]">{nextPrompt || "No next safe prompt yet."}</p>
        </div>
      </div>
    </section>
  );
}
