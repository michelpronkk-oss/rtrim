import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "RunTrim Privacy Policy",
  description: "RunTrim privacy policy for local CLI and cloud sync metadata handling.",
};

const LAST_UPDATED = "2026-04";

export default function PrivacyPage() {
  const sections = [
    {
      title: "What RunTrim is",
      body: [
        "RunTrim is a local-first developer tool for preparing, monitoring, and checking AI coding runs.",
        "RunTrim Free runs locally and stores project metadata in .runtrim.",
      ],
    },
    {
      title: "Local CLI data",
      body: [
        "The local CLI stores run and project metadata such as statuses, prompt artifacts, changed file paths, and memory summaries in your repository.",
        "This local state is used to guide the next safe command and continuation flow.",
      ],
    },
    {
      title: "Cloud sync data",
      body: [
        "When cloud sync is enabled, RunTrim may sync run metadata, generated prompts, changed file paths, project memory, timestamps, and estimated savings.",
        "Cloud sync in V1 is designed for metadata only and not raw source file contents.",
      ],
    },
    {
      title: "Early access data",
      body: [
        "The early access form collects your email and optional role, agent, and use case details.",
        "This information is used to manage private beta access and product communication.",
      ],
    },
    {
      title: "Email and infrastructure providers",
      body: [
        "RunTrim uses Supabase and Vercel for application infrastructure and storage.",
        "RunTrim may send transactional emails through Resend.",
      ],
    },
    {
      title: "What we do not collect",
      body: [
        "RunTrim does not intentionally upload source code, .env files, secrets, or raw file contents in V1.",
        "If you believe sensitive data was synced unexpectedly, contact hello@runtrim.com.",
      ],
    },
    {
      title: "Data retention",
      body: [
        "Local .runtrim data retention is controlled by you in your repository.",
        "Cloud metadata retained in hosted systems may be removed on request by contacting hello@runtrim.com.",
      ],
    },
    {
      title: "Contact",
      body: [
        "For privacy questions or requests, contact hello@runtrim.com.",
      ],
    },
  ];

  return (
    <LegalShell
      active="privacy"
      title="Privacy Policy"
      subtitle="RunTrim is built for local-first development. This page explains what data stays local, what metadata may sync when enabled, and how early access requests are handled."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
