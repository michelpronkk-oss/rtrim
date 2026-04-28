interface RiskMapItem {
  system: string;
  state: "safe" | "sensitive" | "blocked" | "needs_verification";
  note: string;
}

const styles = {
  safe: "border-[#7EE7D8]/30 text-[#9AEFE3] bg-[#7EE7D8]/8",
  sensitive: "border-[#8BA4C2]/30 text-[#B8C7D7] bg-[#8BA4C2]/8",
  blocked: "border-[#FF785A]/30 text-[#FF9C88] bg-[#FF785A]/8",
  needs_verification: "border-[#E9A84D]/30 text-[#F0BF72] bg-[#E9A84D]/8",
};

export function RiskMap({ items }: { items: RiskMapItem[] }) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-[#6D7B8C]">Risk map</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.system} className="rounded-lg border border-white/8 bg-[#0E151E] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium capitalize text-[#E4EBF3]">{item.system}</p>
              <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${styles[item.state]}`}>
                {item.state.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#9AA7B6]">{item.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
