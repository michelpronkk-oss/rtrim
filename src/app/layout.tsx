import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RunTrim - CLI guard layer for AI coding runs",
  description:
    "Audit your task, lock the scope, and create a run contract before Claude, Codex or Cursor touches your repo.",
  keywords: ["AI coding", "Claude", "Codex", "Cursor", "token optimization", "CLI tool"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.10 0 0)",
              border: "1px solid oklch(1 0 0 / 8%)",
              color: "oklch(0.93 0 0)",
            },
          }}
        />
      </body>
    </html>
  );
}
