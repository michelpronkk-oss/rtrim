import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyButton } from "@/components/app/copy-button";

type StepStatus = "done" | "current" | "pending";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

interface StepDef {
  id: string;
  label: string;
  cmd: string;
  note: string | null;
  cta: { label: string; href: string } | null;
}

const STEPS: StepDef[] = [
  {
    id: "install",
    label: "Install CLI",
    cmd: "npm install -g runtrim",
    note: null,
    cta: { label: "View install guide", href: "/app/install" },
  },
  {
    id: "connect",
    label: "Connect CLI",
    cmd: "runtrim login",
    note: null,
    cta: { label: "Open connect page", href: "/app/connect" },
  },
  {
    id: "start",
    label: "Set up your project",
    cmd: "runtrim start",
    note: "Install RunTrim memory, agent instructions, and MCP guidance into your repo. Then run runtrim doctor to confirm Agent Autopilot is ready.",
    cta: null,
  },
  {
    id: "run",
    label: "Create a guarded run",
    cmd: 'runtrim agent "Fix checkout" --copy',
    note: "Create a scoped contract and guarded handoff. Compatible agents use RunTrim memory, path checks, and finish guidance automatically.",
    cta: null,
  },
  {
    id: "finish",
    label: "Finish and sync",
    cmd: "runtrim finish",
    note: "Verify scope, sensitive files, and contract compliance. Syncs the run report, verdict, and restore metadata to the dashboard.",
    cta: null,
  },
];

export interface OnboardingState {
  hasConnectedCli: boolean;
  hasProjects: boolean;
  hasRuns: boolean;
  hasCompletedRun: boolean;
  plan: string;
  planStatus: string | null;
}

function deriveStepStatus(idx: number, s: OnboardingState): StepStatus {
  // install and connect share the same "done" signal: CLI token generated
  const done = [
    s.hasConnectedCli, // install
    s.hasConnectedCli, // connect
    s.hasProjects,     // start (project profile synced)
    s.hasRuns,         // agent run created
    s.hasCompletedRun, // finish
  ];
  if (done[idx]) return "done";
  const prevOk = idx === 0 ? true : !!done[idx - 1];
  return prevOk ? "current" : "pending";
}

export function OnboardingChecklist(state: OnboardingState) {
  const { plan, planStatus } = state;
  const isComplete =
    state.hasConnectedCli &&
    state.hasProjects &&
    state.hasRuns &&
    state.hasCompletedRun;

  // ── Completion card ────────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="rounded-xl border border-[#4DE8B0]/16 bg-[#4DE8B0]/4 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              style={{
                width: 5, height: 5, borderRadius: 1,
                background: "#4DE8B0", flexShrink: 0, display: "inline-block",
              }}
            />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#f4f5f7" }}>
              First guarded run synced. Agent Autopilot is active.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/app/runs"
              className="transition-colors hover:text-[#f4f5f7]"
              style={{ ...MONO, fontSize: 12, color: "#4DE8B0" }}
            >
              View run history
            </Link>
            <Link
              href="/app/connect"
              className="transition-colors hover:text-[#8a8f98]"
              style={{ ...MONO, fontSize: 12, color: "#5a5f68" }}
            >
              Create another guarded run
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan note ──────────────────────────────────────────────────────────────
  const isTrialing = plan !== "free" && planStatus === "trialing";
  const isFree = plan === "free";
  const planNote = isTrialing
    ? "Your Pro trial gives full access. Sync a guarded run to see scope, verdict, and restore metadata in the dashboard."
    : isFree
    ? "Free includes local setup, memory, and guarded runs. Upgrade to Pro to sync run history, restore metadata, and cloud reports."
    : null;

  // ── Checklist card ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-white/6 bg-[#0c0e11] overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ ...MONO, fontSize: 10, color: "#5a5f68", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Activation
        </p>
        <p className="mt-1.5" style={{ fontSize: 14, fontWeight: 600, color: "#f4f5f7", letterSpacing: "-0.01em" }}>
          Get your first guarded run synced
        </p>
        <p className="mt-1" style={{ fontSize: 12.5, color: "#8a8f98", lineHeight: 1.55 }}>
          Set up RunTrim, create a guarded run, finish it, and see scope, verdict and restore metadata here.
        </p>
      </div>

      {/* Steps */}
      <div className="px-5 divide-y divide-white/[0.04]">
        {STEPS.map((step, i) => {
          const status = deriveStepStatus(i, state);
          const isDone    = status === "done";
          const isCurrent = status === "current";

          return (
            <div key={step.id} className="py-3">
              <div className="flex items-start gap-3">

                {/* Status indicator */}
                <span
                  aria-hidden
                  style={{
                    width: 5, height: 5, borderRadius: 1,
                    background: isDone ? "#4DE8B0" : isCurrent ? "#a78bfa" : "#2e3240",
                    flexShrink: 0, marginTop: 5, display: "inline-block",
                  }}
                />

                <div className="min-w-0 flex-1">

                  {/* Step label */}
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: isCurrent ? 500 : 400,
                      color: isDone ? "#5a5f68" : isCurrent ? "#f4f5f7" : "#3a3e46",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {step.label}
                  </p>

                  {/* Current step: command + note + CTA */}
                  {isCurrent && (
                    <div className="mt-2 space-y-2">

                      {/* Command block */}
                      <div
                        className="flex items-center overflow-hidden rounded-[5px]"
                        style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#080a0d" }}
                      >
                        <span
                          style={{ ...MONO, fontSize: 10, color: "#a78bfa", padding: "0 4px 0 10px", flexShrink: 0 }}
                        >
                          $
                        </span>
                        <code
                          style={{
                            ...MONO, fontSize: 11.5, color: "#c9ccd2",
                            flex: 1, padding: "7px 6px 7px 0",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {step.cmd}
                        </code>
                        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", padding: "5px 10px", flexShrink: 0 }}>
                          <CopyButton text={step.cmd} />
                        </div>
                      </div>

                      {/* Step note */}
                      {step.note && (
                        <p style={{ fontSize: 12, color: "#5a5f68", lineHeight: 1.55 }}>
                          {step.note}
                        </p>
                      )}

                      {/* CTA link */}
                      {step.cta && (
                        <Link
                          href={step.cta.href}
                          className="inline-flex items-center gap-1 transition-colors hover:text-[#c9ccd2]"
                          style={{ ...MONO, fontSize: 11.5, color: "#a78bfa" }}
                        >
                          {step.cta.label}
                          <ArrowRight className="size-3" />
                        </Link>
                      )}

                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan note */}
      {planNote && (
        <div
          className="px-5 py-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0a0b0e" }}
        >
          <p style={{ fontSize: 11.5, color: "#3a3e46", lineHeight: 1.6 }}>
            {planNote}
          </p>
        </div>
      )}

    </div>
  );
}
