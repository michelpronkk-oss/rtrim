import { CopyButton } from "./copy-button";

interface CommandWorkflowCardProps {
  title: string;
  description: string;
  commands: string[];
}

export function CommandWorkflowCard({ title, description, commands }: CommandWorkflowCardProps) {
  return (
    <section className="surface-panel rounded-xl p-5">
      <p className="text-sm font-semibold text-[#E4EBF3]">{title}</p>
      <p className="mt-1 text-[13px] text-[#9AA7B6]">{description}</p>
      <div className="mt-4 space-y-2">
        {commands.map((cmd) => (
          <div key={cmd} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#D7DEE7]">{cmd}</code>
            <CopyButton text={cmd} />
          </div>
        ))}
      </div>
    </section>
  );
}
