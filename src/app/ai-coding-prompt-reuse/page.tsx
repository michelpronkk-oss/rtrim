import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("ai-coding-prompt-reuse");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function AiCodingPromptReusePage() {
  return <SeoLandingPage page={pageData} />;
}
