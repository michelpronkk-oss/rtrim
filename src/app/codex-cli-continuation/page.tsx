import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("codex-cli-continuation");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function CodexCliContinuationPage() {
  return <SeoLandingPage page={pageData} />;
}
