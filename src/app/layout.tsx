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
    default: "RunTrim | Scope AI coding runs before they waste tokens",
    template: "%s | RunTrim",
  },
  description:
    "RunTrim is a local-first CLI control layer for Claude, Codex, Cursor, and other AI coding agents. Scope tasks, monitor drift, check results, and continue cleanly.",
  keywords: [
    "runtrim", "RunTrim CLI", "AI coding agent", "AI run control",
    "Claude Code", "Claude Code context limit", "Claude Code token waste",
    "Cursor", "Cursor context limit", "Cursor agent guardrails",
    "Codex CLI", "Codex CLI continuation", "ChatGPT coding agent",
    "AI coding agent guardrails", "AI agent scope drift", "AI coding token waste",
    "AI coding continuation prompt", "AI coding run history", "AI coding verification",
    "AI coding prompt reuse", "local first AI coding tool", "local AI coding",
    "continue AI coding session", "AI token savings", "agent scope control",
    "AI coding CLI", "AI run history", "AI run state", "coding agent memory",
  ],
  authors: [{ name: "RunTrim" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.runtrim.com",
    siteName: "RunTrim",
    title: "RunTrim | Scope AI coding runs before they waste tokens",
    description:
      "RunTrim is a local-first CLI control layer for Claude, Codex, Cursor, and other AI coding agents. Scope tasks, monitor drift, check results, and continue cleanly.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "RunTrim",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim | Scope AI coding runs before they waste tokens",
    description:
      "RunTrim is a local-first CLI control layer for Claude, Codex, Cursor, and other AI coding agents. Scope tasks, monitor drift, check results, and continue cleanly.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    shortcut: ["/favicon.ico"],
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
      "RunTrim is a local-first CLI control layer for Claude, Codex, Cursor, and other AI coding agents.",
    url: "https://www.runtrim.com",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
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
