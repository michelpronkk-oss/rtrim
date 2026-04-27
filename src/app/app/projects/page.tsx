import { AppShell } from "@/components/app/app-shell";
import { ProjectCard } from "@/components/app/project-card";

const SAMPLE_PROJECTS = [
  {
    name: "runtrim (this repo)",
    lastRun: "Just now via runtrim guard",
    currentState: "First guard run complete. Awaiting check.",
    estimatedWasteTrimmed: "~27,000 tokens (estimated)",
    nextSafeAction: "Run runtrim check after your agent completes.",
    risk: "low",
  },
  {
    name: "shopify-storefront",
    lastRun: "Apr 26, 2026 at 14:32",
    currentState: "Checkout flow fix verified. Ready for next run.",
    estimatedWasteTrimmed: "~41,000 tokens (estimated)",
    nextSafeAction: 'runtrim guard "add cart item animation"',
    risk: "low",
  },
  {
    name: "api-service",
    lastRun: "Apr 25, 2026 at 09:15",
    currentState: "Scope drift detected in last run. Auth files touched.",
    estimatedWasteTrimmed: "~19,000 tokens (estimated)",
    nextSafeAction: "Review auth changes before continuing. Run runtrim check.",
    risk: "high",
  },
  {
    name: "marketing-site",
    lastRun: "Apr 23, 2026 at 17:44",
    currentState: "3 runs complete. All passed verification.",
    estimatedWasteTrimmed: "~33,000 tokens (estimated)",
    nextSafeAction: 'runtrim guard "update pricing section copy"',
    risk: "low",
  },
];

export default function ProjectsPage() {
  return (
    <AppShell active="/app/projects">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Project memory built from local run history. One project per .runtrim/ directory.
          </p>
        </div>

        <div className="rounded-sm border border-border bg-card/50 px-5 py-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            How project memory works
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RunTrim tracks run history per repo. Each time you run{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded-sm">
              runtrim guard
            </code>{" "}
            or{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded-sm">
              runtrim check
            </code>
            , the result is saved to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded-sm">
              .runtrim/runs/
            </code>
            . This page aggregates that local history. No sync, no server, no cloud.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Sample projects (demo data)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_PROJECTS.map((project) => (
              <ProjectCard key={project.name} {...project} />
            ))}
          </div>
          <p className="mt-4 text-xs font-mono text-muted-foreground/50">
            Sample data shown above. Your actual projects appear after running runtrim in each repo.
          </p>
        </div>

        <div className="rounded-sm border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Sync (not available in V1)
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            V1 stores everything locally. A future release will optionally sync run history
            across machines and team members. The config flag{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded-sm">
              syncEnabled
            </code>{" "}
            is reserved for this. Set it to{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded-sm">false</code>{" "}
            (default) to keep everything local.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
