import { Cloud, CloudOff } from "lucide-react";

interface SyncStatusPanelProps {
  connected: boolean;
  lastSynced?: string;
  syncedRuns?: number;
}

export function SyncStatusPanel({ connected, lastSynced, syncedRuns }: SyncStatusPanelProps) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4D5070]">Sync status</p>
          <p className="mt-2 text-[14px] font-semibold text-[#EDEEFF]">
            {connected ? "Metadata synced" : "Local only"}
          </p>
          <p className="mt-1.5 text-[12px] leading-5 text-[#6870A0]">
            {connected
              ? "Run metadata is synced. Source code is never uploaded."
              : "Cloud sync is private beta. Join Pro early access for access."}
          </p>
        </div>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${connected ? "border-[#4DE8B0]/25 bg-[#4DE8B0]/8 text-[#4DE8B0]" : "border-white/8 bg-white/4 text-[#4D5070]"}`}>
          {connected ? <Cloud className="size-4" /> : <CloudOff className="size-4" />}
        </div>
      </div>

      {connected ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded border border-white/8 bg-[#090918] px-3 py-2">
            <p className="font-mono text-[10px] uppercase text-[#4D5070]">Last synced</p>
            <p className="mt-0.5 text-[12px] text-[#C0C2E8]">{lastSynced ?? "Unknown"}</p>
          </div>
          <div className="rounded border border-white/8 bg-[#090918] px-3 py-2">
            <p className="font-mono text-[10px] uppercase text-[#4D5070]">Runs synced</p>
            <p className="mt-0.5 text-[12px] text-[#C0C2E8]">{syncedRuns ?? 0}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-1 rounded border border-white/8 bg-[#090918] p-3 font-mono text-[12px] text-[#4D5070]">
          <p className="text-[11px] text-[#6870A0]">Approved testers only</p>
          <p>runtrim auth set &lt;token&gt;</p>
          <p>runtrim sync</p>
        </div>
      )}
    </section>
  );
}
