import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("local-first-ai-coding-tool");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function LocalFirstAiCodingToolPage() {
  return <SeoLandingPage page={pageData} />;
}
