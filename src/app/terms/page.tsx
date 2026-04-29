import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "RunTrim Terms of Service",
  description: "RunTrim terms for local CLI and early access cloud features.",
};

const LAST_UPDATED = "2026-04";

export default function TermsPage() {
  const sections = [
    {
      title: "Service scope",
      body: [
        "RunTrim is a developer tool for preparing, monitoring, and checking AI coding runs.",
        "The service is designed to help teams preserve context and reduce avoidable run risk.",
      ],
    },
    {
      title: "Local CLI and cloud beta",
      body: [
        "Local CLI use is free.",
        "Cloud sync and hosted dashboard features may be offered as private beta or early access.",
      ],
    },
    {
      title: "Your responsibilities",
      body: [
        "You are responsible for use of the tool in your environment and for applying your own review standards.",
        "You are responsible for reviewing and validating AI-generated output before production use.",
      ],
    },
    {
      title: "AI-generated output",
      body: [
        "RunTrim reduces risk with guardrails, monitoring, and checks, but does not guarantee correctness, security, or production fitness.",
        "Treat generated changes and prompts as assisted output that requires human approval.",
      ],
    },
    {
      title: "Acceptable use",
      body: [
        "Do not use RunTrim to upload secrets, prohibited content, or content you do not have rights to process.",
        "Do not attempt to misuse or interfere with hosted systems.",
      ],
    },
    {
      title: "Beta changes",
      body: [
        "Features, limits, and availability may change during beta and early access periods.",
        "Documentation and workflows may be updated as product behavior evolves.",
      ],
    },
    {
      title: "Warranty and liability",
      body: [
        "RunTrim is provided as-is without warranties.",
        "To the maximum extent permitted by law, RunTrim is not liable for indirect, incidental, or consequential damages from use of the service.",
      ],
    },
    {
      title: "Contact",
      body: [
        "Questions about these terms can be sent to hello@runtrim.com.",
      ],
    },
  ];

  return (
    <LegalShell
      active="terms"
      title="Terms of Service"
      subtitle="These terms describe how RunTrim can be used during local-first free usage and private beta cloud access."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
