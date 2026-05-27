import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/app/public-nav";
import { PublicFooter } from "@/components/app/public-footer";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Direct answers about RunTrim scope contracts, local-first privacy, BLOCKED verdicts, restore flow, MCP, and supported coding agents.",
  alternates: { canonical: "https://www.runtrim.com/faq" },
};

type FaqItem = { q: string; a: string };
type FaqSection = { title: string; items: FaqItem[] };

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Trust and privacy",
    items: [
      {
        q: "What is RunTrim?",
        a: "RunTrim is the control, verification and recovery layer for AI coding agents. It gives coding agents scope, memory, finish checks, restore points and continuation prompts while keeping source code local by default.",
      },
      {
        q: "Does RunTrim upload my source code?",
        a: "No. Source code stays local by default. Cloud sync stores run metadata only.",
      },
      {
        q: "What data does RunTrim sync to the cloud?",
        a: "Run metadata such as verdict, changed file paths, project memory summaries, and restore metadata. Not raw source file contents.",
      },
      {
        q: "Can RunTrim read .env files or secrets?",
        a: "RunTrim checks sensitive paths for safety, but does not read or upload env file contents.",
      },
      {
        q: "Is RunTrim local-first if I never log in?",
        a: "Yes. Free runs locally with guarded runs, finish verification, and local restore.",
      },
    ],
  },
  {
    title: "Agent workflow",
    items: [
      {
        q: "Which agents does RunTrim work with?",
        a: "RunTrim works with Claude, Codex, Cursor, ChatGPT, DeepSeek, and other coding agents through copy mode or MCP-compatible workflows.",
      },
      {
        q: "Do I need MCP to use RunTrim?",
        a: "No. MCP is optional. Copy mode works with any agent UI.",
      },
      {
        q: "Does RunTrim replace my coding agent?",
        a: "No. RunTrim is the control, verification and recovery layer around your agent.",
      },
      {
        q: "How is RunTrim different from agent orchestrators?",
        a: "RunTrim is not an orchestrator that routes model calls for you. It is a guard layer that adds scope contracts, verification and recovery around the agent workflow you already use.",
      },
      {
        q: "What is the recommended command flow?",
        a: "runtrim start\nruntrim agent \"your task\" --copy\nruntrim finish\nruntrim restore, if recovery is needed",
      },
    ],
  },
  {
    title: "Restore and recovery",
    items: [
      {
        q: "Does restore use more agent tokens?",
        a: "No. Restore is local recovery and does not require another agent run.",
      },
      {
        q: "Does RunTrim help reduce token waste and speed up coding?",
        a: "Usually yes. By keeping runs scoped and carrying forward project memory, RunTrim often reduces repeated context loading and shortens rework cycles. Results vary by workflow.",
      },
      {
        q: "What happens when a run is BLOCKED?",
        a: "BLOCKED means the run needs review and is not trusted yet. Review the changes, approve a scoped change, or restore.",
      },
      {
        q: "Is restore local or remote?",
        a: "Restore apply is local through the CLI. The dashboard shows restore metadata and recovery guidance.",
      },
      {
        q: "What is restore metadata?",
        a: "Restore metadata is the run-linked recovery record shown in dashboard history. File recovery still happens locally.",
      },
    ],
  },
  {
    title: "Plans and limits",
    items: [
      {
        q: "What is included in Free vs Pro vs Builder vs Team?",
        a: "Free protects one project locally. Pro adds cloud sync and dashboard history for your main project. Builder adds unlimited projects and CI Gate. Team adds governance controls, with some capabilities marked reviewed access or coming soon.",
      },
      {
        q: "How is RunTrim different from Git?",
        a: "Git tracks version history. RunTrim adds run-level control, verification and local restore for AI coding agent workflows before and after changes are made.",
      },
      {
        q: "Why is cloud history locked on Free?",
        a: "Free is designed for local-first guarded runs. Pro unlocks cloud run history, memory sync, and restore metadata sync.",
      },
      {
        q: "When should I upgrade to Builder?",
        a: "Upgrade when you need multi-project protection, advanced recovery history, and CI merge gating.",
      },
      {
        q: "Is Team fully live or reviewed access?",
        a: "Team is reviewed access. Some governance features are live or rolling out, and unfinished capabilities should be labeled coming soon.",
      },
    ],
  },
  {
    title: "Teams and CI",
    items: [
      {
        q: "Does RunTrim block risky PRs in CI?",
        a: "Yes, with runtrim ci check when configured. BLOCKED runs should fail the check.",
      },
      {
        q: "Are GitHub checks and policies live for all plans?",
        a: "No. CI and policy depth are plan-gated. Builder unlocks CI Gate, and Team expands governance.",
      },
      {
        q: "What governance features are live today for Team?",
        a: "Only show implemented controls as live. Label shared logs, approvals, and policy surfaces accurately if still rolling out.",
      },
    ],
  },
];

export default function FaqPage() {
  const flatFaq = FAQ_SECTIONS.flatMap((section) => section.items);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: flatFaq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090b] text-[#f4f5f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PublicNav />

      <section
        className="pt-14 pb-12 sm:pt-20 sm:pb-16"
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 35%, black 35%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(1200px 700px at 50% -200px, rgba(109,76,242,0.07), transparent 60%)",
          }}
        />

        <div className="mx-auto relative z-10" style={{ maxWidth: 1240, padding: "0 clamp(20px,4vw,40px)" }}>
          <span
            className="inline-flex rounded-full border border-[#a78bfa]/25 bg-[#a78bfa]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#a78bfa]"
          >
            FAQ
          </span>
          <h1 className="mt-5 text-[clamp(34px,5.4vw,62px)] font-medium leading-[1.04] tracking-[-0.033em] text-[#f4f5f7]">
            RunTrim FAQ
          </h1>
          <p className="mt-5 max-w-[620px] text-[17px] leading-[1.6] text-[#c9ccd2]">
            Answers about privacy, guarded runs, restore and plan limits.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-4">
          {FAQ_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6"
            >
              <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.items.map((item) => (
                  <article key={item.q} className="rounded-[8px] border border-white/6 bg-[#090b0e] p-4">
                    <h3 className="text-[14px] font-semibold text-[#f4f5f7]">{item.q}</h3>
                    <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.65] text-[#8a8f98]">{item.a}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-[10px] border border-white/10 bg-[#0c0e11] p-5 sm:p-6">
          <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[#f4f5f7]">Next step</h2>
          <p className="mt-2 text-[13px] leading-[1.65] text-[#8a8f98]">
            Start local with the CLI, then unlock cloud history and governance when your workflow needs it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/app/install"
              className="inline-flex h-9 items-center justify-center rounded-[7px] border border-white bg-[#f4f5f7] px-4 text-[13px] font-medium text-[#0b0d10] transition-colors hover:bg-white"
            >
              Install CLI
            </Link>
            <Link
              href="/plans"
              className="inline-flex h-9 items-center justify-center rounded-[7px] border border-white/14 px-4 text-[13px] font-medium text-[#c9ccd2] transition-colors hover:border-white/28 hover:bg-[#16191e] hover:text-[#f4f5f7]"
            >
              View plans
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
