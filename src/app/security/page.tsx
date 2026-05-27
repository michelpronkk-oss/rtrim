import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Security",
  description:
    "RunTrim is designed around local-first usage, metadata-only sync, and no source code upload in V1.",
  alternates: {
    canonical: "https://www.runtrim.com/security",
  },
};

const LAST_UPDATED = "2026-04";

export default function SecurityPage() {
  const sections = [
    {
      title: "Security model",
      body: [
        "RunTrim is built with a local-first model that minimizes remote data exposure in V1.",
        "The CLI reads local RunTrim metadata and git file paths to support guardrails and run continuity.",
      ],
    },
    {
      title: "Local-first design",
      body: [
        "RunTrim Free operates locally in your repository using .runtrim artifacts.",
        "Source code is not uploaded by default in V1.",
      ],
    },
    {
      title: "Cloud sync boundaries",
      body: [
        "Cloud sync is designed to store metadata only, including run status, generated prompts, changed file paths, memory summaries, timestamps, and estimate metrics.",
        "Cloud sync does not intentionally include raw source contents in V1.",
      ],
    },
    {
      title: "Secrets and env files",
      body: [
        "RunTrim does not intentionally upload .env files, secrets, or raw file contents in V1.",
        "Users are responsible for local repository hygiene and secure environment management.",
      ],
    },
    {
      title: "Service role handling",
      body: [
        "Supabase service role keys are used server-side only for trusted backend operations.",
        "Service credentials are not exposed to client components.",
      ],
    },
    {
      title: "Reporting security issues",
      body: [
        "Report security issues to hello@runtrim.com with details needed to reproduce and assess impact.",
      ],
    },
    {
      title: "Contact",
      body: [
        "Security and trust questions can be sent to hello@runtrim.com.",
        "For direct product behavior answers, see /faq.",
      ],
    },
  ];

  return (
    <LegalShell
      active="security"
      title="Security"
      subtitle="RunTrim is designed to keep source code local and synchronize metadata boundaries only when cloud sync is enabled."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
