import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("ai-agent-scope-drift");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function AiAgentScopeDriftPage() {
  return <SeoLandingPage page={pageData} />;
}
