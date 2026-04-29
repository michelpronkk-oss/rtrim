import type { Metadata } from "next";
import Link from "next/link";
import { AppAccessGateCard } from "@/components/app/app-access-gate-card";
import { isAppAccessCodeConfigured } from "@/lib/app-gate";

export const metadata: Metadata = {
  title: "RunTrim Cloud private beta access",
  robots: {
    index: false,
    follow: false,
  },
};

interface AppAccessPageProps {
  searchParams?: Promise<{ next?: string }>;
}

export default async function AppAccessPage({ searchParams }: AppAccessPageProps) {
  const isDev = process.env.NODE_ENV !== "production";
  const accessConfigured = isAppAccessCodeConfigured() || isDev;
  const resolvedParams = searchParams ? await searchParams : {};
  const rawNext = resolvedParams?.next || "/app";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";
  const showDevNote = isDev && !isAppAccessCodeConfigured();

  return (
    <div className="min-h-screen bg-[#07071A] text-[#EDEEFF]">
      <header className="border-b border-white/10 bg-[#090A1D]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <Link
            href="/app/install"
            className="rounded-md border border-white/12 px-3 py-1.5 text-[12px] text-[#A7B2C6] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Install CLI
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-6xl items-center px-6 py-10">
        <div className="w-full">
          <AppAccessGateCard accessConfigured={accessConfigured} nextPath={nextPath} showDevNote={showDevNote} />
        </div>
      </main>
    </div>
  );
}
