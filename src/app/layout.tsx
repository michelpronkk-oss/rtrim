import type { Metadata } from "next";
import { Inter_Tight, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SiteAnalytics } from "@/components/app/site-analytics";
import { AuthCodeInterceptor } from "@/components/app/auth-code-interceptor";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.runtrim.com"),
  title: {
    default: "RunTrim | AI Agent Control Layer",
    template: "%s | RunTrim",
  },
  description:
    "Control, verify and recover AI coding runs with scoped contracts, memory, finish checks, CI gates and local restore points. Free CLI. Local-first. No account required.",
  keywords: [
    "runtrim", "RunTrim CLI", "AI coding agent control layer",
    "Claude Code guardrails", "Claude Code context limit", "Claude Code token waste",
    "Claude Code run history", "Claude Code scope control", "Claude Code memory",
    "Cursor agent guardrails", "Cursor context limit", "Cursor run history",
    "Cursor AI scope control", "Cursor AI memory",
    "Codex CLI guardrails", "Codex CLI continuation", "OpenAI Codex guardrails",
    "AI coding agent guardrails", "AI agent scope drift", "AI coding run history",
    "AI coding token waste", "AI coding continuation prompt", "AI coding verification",
    "AI coding prompt reuse", "AI coding memory", "AI coding scoped tasks",
    "local-first AI coding tool", "local AI coding", "no source code upload AI",
    "AI coding workflow", "agent run control", "AI coding agent memory",
    "forbidden file rules AI agent", "finish check AI coding",
    "runtrim start", "runtrim agent", "runtrim finish", "runtrim mcp",
  ],
  authors: [{ name: "RunTrim" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.runtrim.com",
    siteName: "RunTrim",
    title: "RunTrim | AI Agent Control Layer",
    description:
      "Control, verify and recover AI coding runs with scoped contracts, memory, finish checks, CI gates and local restore points. Free CLI. Local-first.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "RunTrim | AI Agent Control Layer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim | AI Agent Control Layer",
    description:
      "Control, verify and recover AI coding runs with scoped contracts, memory, finish checks, CI gates and local restore points. Free CLI. Local-first.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RunTrim",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows, macOS, Linux",
    description:
      "RunTrim is the CLI control layer for AI coding agents. It gives Claude Code, Cursor, Codex, and ChatGPT scoped contracts, project memory, forbidden-file rules, finish checks, and run history before they touch your code.",
    url: "https://www.runtrim.com",
    downloadUrl: "https://www.npmjs.com/package/runtrim",
    installUrl: "https://www.runtrim.com/app/install",
    softwareVersion: "0.1.27",
    featureList: [
      "Scoped task contracts for AI coding agents",
      "Project memory and agent file injection",
      "Forbidden-file rules and sensitive file detection",
      "Finish checks with PASS/WARN/BLOCKED verdicts",
      "Local run history",
      "MCP server for compatible agents",
      "Cloud sync (Pro)",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "Local-first CLI with unlimited guarded runs, project memory, and local run history.",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "29",
        priceCurrency: "USD",
        billingIncrement: "P1M",
        description: "Cloud sync, memory sync, and dashboard run history at $29/month.",
      },
    ],
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RunTrim",
    url: "https://www.runtrim.com",
    logo: "https://www.runtrim.com/icon.svg",
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@runtrim.com",
      contactType: "customer support",
    },
  };

  return (
    <html
      lang="en"
      className={`${interTight.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <SiteAnalytics />
        <AuthCodeInterceptor />
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "#0C1119",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F5F7FA",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}
