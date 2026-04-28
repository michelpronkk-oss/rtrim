interface SyncStatusPanelProps {
  connected: boolean;
  lastSynced?: string;
  syncedRuns?: number;
}

export function SyncStatusPanel({ connected, lastSynced, syncedRuns }: SyncStatusPanelProps) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Sync status</p>
      <p className="mt-2 text-sm font-semibold text-[#E4EBF3]">{connected ? "Synced metadata available" : "No synced project yet"}</p>
      <p className="mt-1 text-[13px] text-[#9AA7B6]">
        {connected
          ? "The CLI does the work locally. Sync uploads metadata only, not source code."
          : "Local memory is available now. Cloud sync is private beta."}
      </p>
      <div className="mt-3 space-y-1 text-[12px] text-[#A5B1BF]">
        {connected ? (
          <>
            <p>Last synced: {lastSynced ?? "Unknown"}</p>
            <p>Synced runs: {syncedRuns ?? 0}</p>
          </>
        ) : (
          <>
            <p>Run runtrim auth set &lt;token&gt;</p>
            <p>Then run runtrim sync</p>
          </>
        )}
      </div>
    </section>
  );
}
