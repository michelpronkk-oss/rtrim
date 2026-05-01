import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo/SeoLandingPage";
import { buildSeoMetadata, getSeoPage } from "@/lib/seo-pages";

const pageData = getSeoPage("ai-coding-verification");

export const metadata: Metadata = buildSeoMetadata(pageData);

export default function AiCodingVerificationPage() {
  return <SeoLandingPage page={pageData} />;
}
