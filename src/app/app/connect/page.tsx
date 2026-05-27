import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { CopyButton } from "@/components/app/copy-button";
import { GenerateTokenButton } from "@/components/app/generate-token-button";
import { ConnectInstallTabs } from "@/components/app/connect-install-tabs";

export const metadata: Metadata = {
  title: "Connect CLI",
  robots: { index: false, follow: false },
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

function CmdBlock({ cmd }: { cmd: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 7, background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", ...MONO, fontSize: 12.5, color: "#c9ccd2" }}>
      <span style={{ color: "#a78bfa", flexShrink: 0 }}>$</span>
      <span style={{ flex: 1, overflowX: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd}</span>
      <CopyButton text={cmd} />
    </div>
  );
}

type CheckItem = { icon: "ok" | "warn"; title: string; sub: string; pill: string; pillColor: "scope" | "warn" };

export default async function ConnectPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  let hasConnectedCli = false;
  let cliCreatedAt: string | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("runtrim_profiles")
      .select("cli_token_created_at")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      hasConnectedCli = !!(data.cli_token_created_at as string | null);
      cliCreatedAt = (data.cli_token_created_at as string | null) ?? null;
    }
  }

  const username = user.email ? user.email.split("@")[0] : "dashboard";

  // Pipeline stages
  const stages = [
    {
      n: "01",
      status: hasConnectedCli ? "done" : "active",
      label: "Install runtrim",
      desc: hasConnectedCli ? "Binary installed on your machine." : "Install the runtrim binary via npm or package manager.",
      cmd: "npm install -g runtrim",
    },
    {
      n: "02",
      status: hasConnectedCli ? "done" : "future",
      label: "Pair with workspace",
      desc: hasConnectedCli
        ? `Authenticated as ${user.email}`
        : `Auth this machine to ${user.email}. Browser will open to confirm.`,
      cmd: "runtrim login",
    },
    {
      n: "03",
      status: "future" as const,
      label: "Run readiness check",
      desc: "Confirms binary, auth, repo init, and agent reachability.",
      cmd: "runtrim doctor",
    },
  ] satisfies Array<{ n: string; status: "done" | "active" | "future"; label: string; desc: string; cmd: string }>;

  const doctorChecks: CheckItem[] = [
    { icon: hasConnectedCli ? "ok" : "warn", title: "runtrim binary on PATH", sub: "npm install -g runtrim", pill: hasConnectedCli ? "pass" : "action", pillColor: hasConnectedCli ? "scope" : "warn" },
    { icon: hasConnectedCli ? "ok" : "warn", title: "Workspace token authenticated", sub: hasConnectedCli ? `${user.email}` : "runtrim login", pill: hasConnectedCli ? "pass" : "action", pillColor: hasConnectedCli ? "scope" : "warn" },
    { icon: "warn", title: "No project initialized", sub: "run runtrim start in your repo", pill: "action", pillColor: "warn" },
    { icon: "warn", title: "No agent configured", sub: "MCP optional · copy-mode works with any agent", pill: "action", pillColor: "warn" },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>

      {/* ── Page head ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 8 }}>
            <span style={{ color: "#a78bfa", background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.25)", padding: "1px 7px", borderRadius: 4, letterSpacing: "0.04em" }}>setup</span>
            <span>workspace · personal</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: "-0.025em", color: "#f4f5f7", lineHeight: 1.1 }}>
            Connect the CLI to this workspace.
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "#8a8f98", maxWidth: 560 }}>
            RunTrim runs locally. The CLI enforces scope, verifies finishes, and records runs. Install once per machine.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <a
            href="/app/install"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, border: "1px solid rgba(255,255,255,0.16)", color: "#c9ccd2", textDecoration: "none" }}
            className="hover:border-white/30 hover:text-[#f4f5f7] transition-colors"
          >
            CLI reference
          </a>
          <div style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, background: "#f4f5f7", color: "#0b0d10", border: "1px solid #fff", cursor: "pointer" }}
            className="hover:bg-white transition-colors"
          >
            <span style={{ ...MONO, fontSize: 12 }}>runtrim doctor</span>
          </div>
        </div>
      </div>

      {/* ── Install pipeline ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y divide-white/[0.06] sm:divide-y-0 sm:divide-x" style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, overflow: "hidden", background: "linear-gradient(180deg, #0e1116, #0a0c10)", marginBottom: 24 }}>
        {stages.map((stage, i) => {
          const isDone   = stage.status === "done";
          const isActive = stage.status === "active";
          const isFuture = stage.status === "future";
          return (
            <div
              key={stage.n}
              style={{
                padding: "22px 22px 20px",
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.08em" }}>
                <span style={{
                  width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                  background: isDone ? "#6ee7b7" : isActive ? "#a78bfa" : "#1c2026",
                  border: isDone ? "none" : isActive ? "none" : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: isDone ? "0 0 8px #6ee7b7" : isActive ? "0 0 10px #a78bfa" : "none",
                }} />
                <span>{stage.n} {isDone ? "· done" : isActive ? "· current" : "· pending"}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: isFuture ? "rgba(244,245,247,0.45)" : "#f4f5f7", letterSpacing: "-0.005em" }}>
                {stage.label}
              </span>
              <span style={{ fontSize: 12.5, color: isFuture ? "rgba(138,143,152,0.5)" : "#8a8f98", lineHeight: 1.45 }}>
                {stage.desc}
              </span>
              <div style={{ marginTop: "auto", paddingTop: 12, opacity: isFuture ? 0.5 : 1 }}>
                <CmdBlock cmd={stage.cmd} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Install methods + token ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Install method tabs (client component) */}
        <ConnectInstallTabs />

        {/* Workspace token */}
        <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, background: "#0c0e11", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>
            <span>Workspace token</span>
            <span style={{ marginLeft: "auto", ...MONO, fontSize: 10, color: hasConnectedCli ? "#6ee7b7" : "#f5a524", border: `1px solid ${hasConnectedCli ? "rgba(110,231,183,0.25)" : "rgba(245,165,36,0.28)"}`, background: hasConnectedCli ? "rgba(110,231,183,0.06)" : "rgba(245,165,36,0.06)", padding: "2px 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 5px currentColor" }} />
              {hasConnectedCli ? "active" : "not paired"}
            </span>
          </div>

          <GenerateTokenButton hasConnectedCli={hasConnectedCli} cliCreatedAt={cliCreatedAt} />
        </div>
      </div>

      {/* ── MCP config ───────────────────────────────────────── */}
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>optional</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>MCP server configuration</span>
          <span style={{ ...MONO, fontSize: 11, color: "#5a5f68", letterSpacing: "0.06em" }}>paste into your agent&apos;s MCP config</span>
          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, ...MONO, fontSize: 10, color: "#a78bfa", border: "1px solid rgba(167,139,250,0.28)", background: "rgba(167,139,250,0.06)", padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 5px currentColor" }} />
            Claude · Cursor · Codex
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ fontSize: 13, color: "#8a8f98", margin: "0 0 14px" }}>
            MCP lets supported agents create guarded runs directly. Optional — copy-mode works with any agent UI.
          </p>
          <div style={{ background: "#16191e", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "14px 16px", ...MONO, fontSize: 12.5, color: "#c9ccd2", lineHeight: 1.55, overflow: "auto", marginBottom: 12 }}>
            <span style={{ color: "#5a5f68" }}>{`// ~/.claude/mcp.json`}</span>{"\n"}
            {"{"}{"\n"}
            {"  "}<span style={{ color: "#a78bfa" }}>&quot;mcpServers&quot;</span>{": {"}{"\n"}
            {"    "}<span style={{ color: "#a78bfa" }}>&quot;runtrim&quot;</span>{": {"}{"\n"}
            {"      "}<span style={{ color: "#a78bfa" }}>&quot;command&quot;</span>{": "}<span style={{ color: "#6ee7b7" }}>&quot;runtrim&quot;</span>{","}{"\n"}
            {"      "}<span style={{ color: "#a78bfa" }}>&quot;args&quot;</span>{": ["}<span style={{ color: "#6ee7b7" }}>&quot;mcp&quot;</span>{", "}<span style={{ color: "#6ee7b7" }}>&quot;start&quot;</span>{"]"}{"\n"}
            {"    }"}{"\n"}
            {"  }"}{"\n"}
            {"}"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <CopyButton
              text={`{\n  "mcpServers": {\n    "runtrim": {\n      "command": "runtrim",\n      "args": ["mcp", "start"]\n    }\n  }\n}`}
              label="Copy snippet"
            />
            <a
              href="/app/install"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid rgba(255,255,255,0.16)", color: "#c9ccd2", textDecoration: "none" }}
              className="hover:text-white hover:border-white/30 transition-colors"
            >
              MCP setup guide
            </a>
          </div>
        </div>
      </div>

      {/* ── Doctor readiness ─────────────────────────────────── */}
      <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#0c0e11", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", letterSpacing: "0.10em", textTransform: "uppercase" }}>readiness</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#f4f5f7", letterSpacing: "-0.005em" }}>runtrim doctor</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {!hasConnectedCli && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, ...MONO, fontSize: 10, color: "#f5a524", border: "1px solid rgba(245,165,36,0.25)", background: "rgba(245,165,36,0.06)", padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                2 to resolve
              </span>
            )}
            <CmdBlock cmd="runtrim doctor" />
          </div>
        </div>
        <div style={{ padding: "6px 0" }}>
          {doctorChecks.map((check, i) => (
            <div
              key={i}
              style={{ padding: "11px 18px", display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 12, alignItems: "center", borderBottom: i < doctorChecks.length - 1 ? "1px dashed rgba(255,255,255,0.04)" : "none" }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center",
                ...MONO, fontSize: 11,
                color: check.icon === "ok" ? "#6ee7b7" : "#f5a524",
                background: check.icon === "ok" ? "rgba(110,231,183,0.08)" : "rgba(245,165,36,0.08)",
                border: `1px solid ${check.icon === "ok" ? "rgba(110,231,183,0.25)" : "rgba(245,165,36,0.28)"}`,
              }}>
                {check.icon === "ok" ? "✓" : "!"}
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#f4f5f7" }}>{check.title}</div>
                <div style={{ ...MONO, fontSize: 10.5, color: "#5a5f68", marginTop: 2 }}>{check.sub}</div>
              </div>
              <span style={{
                ...MONO, fontSize: 10.5, padding: "2px 8px", borderRadius: 4,
                color: check.pillColor === "scope" ? "#6ee7b7" : "#f5a524",
                background: check.pillColor === "scope" ? "rgba(110,231,183,0.07)" : "rgba(245,165,36,0.07)",
                border: `1px solid ${check.pillColor === "scope" ? "rgba(110,231,183,0.28)" : "rgba(245,165,36,0.30)"}`,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {check.pill}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          `One token per workspace. Generating a new token invalidates the previous one.`,
          `Run ${"`runtrim sync`"} at any time to push the latest runs. Runs already synced are deduplicated automatically.`,
          `Source code never leaves your machine. Cloud sync uploads run metadata only.`,
        ].map((note, i) => (
          <p key={i} style={{ ...MONO, fontSize: 11.5, color: "#3a3e46", margin: 0 }}>{note}</p>
        ))}
      </div>

    </div>
  );
}
