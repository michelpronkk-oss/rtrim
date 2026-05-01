import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("cursor-agent-guardrails");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function CursorAgentGuardrailsPage() {
  return <SeoLandingPage page={pageData} />;
}
