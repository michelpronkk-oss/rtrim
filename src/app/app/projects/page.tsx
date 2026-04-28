import { AppShell } from "@/components/app/app-shell";
import { ProjectCard } from "@/components/app/project-card";

const PROJECTS = [
  {
    name: "rtrim",
    lastRun: "Apr 28, 2026 14:34",
    currentState: "Landing page overhaul in verification mode",
    estimatedWasteTrimmed: "~71k tokens",
    nextSafeAction: "Run check, confirm root cause and verification sections, then mark done.",
    risk: "medium",
  },
  {
    name: "shop-checkout",
    lastRun: "Apr 27, 2026 10:15",
    currentState: "Checkout redirect patch passed",
    estimatedWasteTrimmed: "~126k tokens",
    nextSafeAction: "Guard next task for cart edge-case retry logic.",
    risk: "low",
  },
  {
    name: "api-gateway",
    lastRun: "Apr 26, 2026 09:01",
    currentState: "Split required on auth and DB request",
    estimatedWasteTrimmed: "~58k tokens",
    nextSafeAction: "Start auth scope audit only before any code edits.",
    risk: "high",
  },
  {
    name: "marketing-site",
    lastRun: "Apr 25, 2026 17:44",
    currentState: "All recent runs passed verification",
    estimatedWasteTrimmed: "~42k tokens",
    nextSafeAction: "Guard homepage copy edits as one isolated run.",
    risk: "low",
  },
];

export default function ProjectsPage() {
  return (
    <AppShell active="/app/projects">
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-[#EEEEF2]">Projects</h1>
          <p className="mt-1 text-[13px] text-[#4A4E72]">Last run state, risk, and next safe action across repositories.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.name} {...project} />
          ))}
        </div>

        <div className="surface-panel rounded-lg p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4A4E72]">How it works</p>
          <p className="mt-2 text-[13px] leading-6 text-[#4A4E72]">
            Each repository keeps local run history in{" "}
            <code className="font-mono text-[#0DDB9E]">.runtrim/runs/</code>.
            {" "}RunTrim summarizes that history into project state, savings, and continuation guidance.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
