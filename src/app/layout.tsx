import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  metadataBase: new URL("https://runtrim.com"),
  title: {
    default: "RunTrim: Stop paying twice for the same context",
    template: "%s | RunTrim",
  },
  description:
    "RunTrim tracks your AI coding runs, prompts, reusable context, and estimated savings so every next agent starts from what your project already knows.",
  keywords: [
    "AI coding", "Claude Code", "Codex", "Cursor", "ChatGPT",
    "token savings", "prompt history", "run history", "context reuse", "CLI tool",
  ],
  authors: [{ name: "RunTrim" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://runtrim.com",
    siteName: "RunTrim",
    title: "RunTrim: Stop paying twice for the same context",
    description:
      "Track AI coding runs, prompts, and estimated savings. Every next agent starts from what your project already knows.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RunTrim: Stop paying twice for the same context",
    description:
      "Track AI coding runs, prompts, and estimated savings. Every next agent starts from what your project already knows.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
