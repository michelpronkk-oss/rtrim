import { RunStatusBadge } from "./run-status-badge";

export interface RunDecisionItem {
  id: string;
  task: string;
  status: string;
  riskBefore: string;
  riskAfter?: string;
  filesChanged: number;
  decision: string;
  nextAction: string;
  date: string;
}

export function RunDecisionTimeline({ items }: { items: RunDecisionItem[] }) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Recent run timeline</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-white/8 bg-[#0E151E] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] text-[#7D8A99]">{item.date}</p>
              <RunStatusBadge status={item.status} />
            </div>
            <p className="mt-2 text-[14px] font-medium leading-6 text-[#E4EBF3]">{item.task}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-[#A5B1BF]">
              <span>Risk: {item.riskBefore.toUpperCase()}{item.riskAfter ? ` -> ${item.riskAfter.toUpperCase()}` : ""}</span>
              <span>Files: {item.filesChanged}</span>
            </div>
            <p className="mt-2 text-[12px] text-[#D7DEE7]">Decision: {item.decision}</p>
            <p className="mt-1 text-[12px] text-[#9AA7B6]">Next: {item.nextAction}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
