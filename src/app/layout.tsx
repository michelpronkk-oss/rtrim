import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { RUNTRIM_ICON_PATH } from "@/lib/branding";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.runtrim.com"),
  title: {
    default: "RunTrim | Scope AI coding runs before they waste tokens",
    template: "%s | RunTrim",
  },
  description:
    "RunTrim is a local-first CLI control layer for Claude, Codex, Cursor, and other AI coding agents. Scope tasks, monitor drift, check results, and continue cleanly.",
  keywords: [
    "AI coding", "Claude Code", "Codex", "Cursor", "ChatGPT",
    "token savings", "prompt history", "run history", "context reuse", "CLI tool",
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
      { url: RUNTRIM_ICON_PATH, type: "image/svg+xml" },
      { url: RUNTRIM_ICON_PATH, sizes: "any" },
    ],
    shortcut: RUNTRIM_ICON_PATH,
    apple: RUNTRIM_ICON_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
