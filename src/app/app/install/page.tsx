import { AppShell } from "@/components/app/app-shell";
import { TerminalCard } from "@/components/app/terminal-card";
import { CopyButton } from "@/components/app/copy-button";

const GLOBAL_INSTALL = [
  { type: "comment" as const, text: "# Install globally (when published)" },
  { type: "prompt" as const, text: "$ npm install -g runtrim" },
  { text: "" },
  { type: "comment" as const, text: "# Initialize in your repo" },
  { type: "prompt" as const, text: "$ runtrim init" },
  { text: "" },
  { type: "output" as const, text: "  RunTrim initialized." },
  { type: "dim" as const, text: "  .runtrim/config.json   created" },
  { type: "dim" as const, text: "  .runtrim/runs/         created" },
];

const LOCAL_INSTALL = [
  { type: "comment" as const, text: "# Run locally without global install" },
  { type: "prompt" as const, text: "$ npm run runtrim -- init" },
  { type: "prompt" as const, text: '$ npm run runtrim -- guard "fix checkout redirect"' },
  { type: "prompt" as const, text: "$ npm run runtrim -- check" },
  { type: "prompt" as const, text: "$ npm run runtrim -- report" },
];

const GUARD_EXAMPLE = [
  { type: "prompt" as const, text: '$ runtrim guard "fix checkout redirect"' },
  { text: "" },
  { type: "dim" as const, text: "  Task         fix checkout redirect" },
  { type: "dim" as const, text: "  Score before 47/100" },
  { type: "accent" as const, text: "  Waste risk   HIGH" },
  { text: "" },
  { type: "dim" as const, text: "  Flags:" },
  { type: "dim" as const, text: "  ! Vague task description" },
  { type: "dim" as const, text: "  ! No success condition" },
  { type: "dim" as const, text: "  ! No stop rules defined" },
  { text: "" },
  { type: "dim" as const, text: "  Score after          92/100" },
  { type: "accent" as const, text: "  Estimated tokens     ~27,000 trimmed (estimated)" },
  { type: "accent" as const, text: "  Estimated savings    ~$0.08 (estimated)" },
  { text: "" },
  { type: "output" as const, text: "  Guarded contract copied. Paste it into your AI coding agent." },
];

const STEPS = [
  {
    title: "Initialize",
    cmd: "runtrim init",
    localCmd: "npm run runtrim -- init",
    desc: "Creates .runtrim/config.json and .runtrim/runs/. Detects your stack from package.json. Adds .runtrim/runs/ to .gitignore automatically.",
  },
  {
    title: "Guard a task",
    cmd: 'runtrim guard "your task"',
    localCmd: 'npm run runtrim -- guard "fix checkout redirect"',
    desc: "Audits the raw task for waste risk. Scores it 0-100. Generates a strict guarded run contract with relevant scope, forbidden scope, stop rules, and required output format. Copies to clipboard.",
  },
  {
    title: "Run your agent",
    cmd: "Paste contract into Claude, Codex, or Cursor",
    localCmd: null,
    desc: "The agent receives a structured contract instead of a raw prompt. Scope drift is reduced. Token waste is reduced. The output format is enforced.",
  },
  {
    title: "Check the result",
    cmd: "runtrim check",
    localCmd: "npm run runtrim -- check",
    desc: "Reads the git diff automatically. Flags files that touched forbidden scope. Evaluates agent output for missing proof items (root cause, changed files, verification steps).",
  },
  {
    title: "View report",
    cmd: "runtrim report",
    localCmd: "npm run runtrim -- report",
    desc: "Shows all runs, estimated tokens trimmed, average risk reduction, scope drift warnings, and the next safe action for the latest run.",
  },
];

export default function InstallPage() {
  return (
    <AppShell active="/app/install">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">Install</h1>
          <p className="text-sm text-muted-foreground">
            RunTrim runs inside your repo. No account. No uploads.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Global install (when published)
            </h2>
            <TerminalCard
              title="terminal"
              lines={GLOBAL_INSTALL}
              copyText="npm install -g runtrim && runtrim init"
            />
          </div>

          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Local dev (use this now)
            </h2>
            <TerminalCard
              title="terminal"
              lines={LOCAL_INSTALL}
              copyText={[
                "npm run runtrim -- init",
                'npm run runtrim -- guard "fix checkout redirect"',
                "npm run runtrim -- check",
                "npm run runtrim -- report",
              ].join("\n")}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Guard example output
          </h2>
          <TerminalCard title="terminal" lines={GUARD_EXAMPLE} />
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Commands reference
          </h2>

          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-sm border border-border bg-card p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <code className="text-xs font-mono text-accent mt-0.5 block">{step.cmd}</code>
                </div>
                {step.localCmd && (
                  <div className="flex items-center gap-2 shrink-0">
                    <code className="text-xs font-mono text-muted-foreground">
                      {step.localCmd}
                    </code>
                    <CopyButton text={step.localCmd} />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-sm border border-border bg-card p-5">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Privacy
          </h3>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>V1 does not upload your code, tasks, or run data to any server.</p>
            <p>
              All data is stored locally in{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">.runtrim/</code> in your
              project root.
            </p>
            <p>
              Run history files are excluded from git automatically (
              <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">.runtrim/runs/</code>{" "}
              is added to .gitignore on init).
            </p>
            <p>
              Config{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded-sm">.runtrim/config.json</code>{" "}
              can be committed if you want team-level defaults.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
