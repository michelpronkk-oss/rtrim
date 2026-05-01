import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("ai-coding-run-history");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function AiCodingRunHistoryPage() {
  return <SeoLandingPage page={pageData} />;
}
