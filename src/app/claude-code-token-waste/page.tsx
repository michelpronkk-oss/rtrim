import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("claude-code-token-waste");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function ClaudeCodeTokenWastePage() {
  return <SeoLandingPage page={pageData} />;
}
