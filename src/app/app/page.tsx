import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { EarlyAccessModalTrigger } from "@/components/app/early-access-modal-trigger";

export const metadata: Metadata = {
  title: "RunTrim Cloud is being prepared",
  robots: {
    index: false,
    follow: false,
  },
};

const ROADMAP_ITEMS = [
  "Hosted project memory",
  "Synced run history",
  "Continuation prompts across sessions",
  "Multi-project visibility",
];

export default function AppHoldingPage() {
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
            className="rounded-md bg-[#7C6DFA] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            Install CLI
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-65px)] w-full max-w-6xl items-center px-6 py-10">
        <section className="w-full rounded-xl border border-white/10 bg-[#0C0D22] p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7682A6]">CLOUD DASHBOARD</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#EDEEFF] sm:text-[34px]">
            RunTrim Cloud is being prepared
          </h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#9DABC4]">
            The local CLI is available now. Hosted memory, synced run history, and team visibility are rolling out through Pro early access.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/app/install"
              className="rounded-md bg-[#7C6DFA] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Install CLI
            </Link>
            <EarlyAccessModalTrigger
              label="Join Pro early access"
              variant="pro"
              className="rounded-md border border-white/12 px-4 py-2 text-[13px] font-medium text-[#A7B2C6] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            />
          </div>

          <p className="mt-4 text-[12px] text-[#6C7797]">
            Free local CLI does not require an account. Source code stays local.
          </p>

          <div className="mt-6 rounded-lg border border-white/8 bg-[#0A0C1F] p-4 sm:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7A85A6]">Roadmap</p>
            <ul className="mt-3 space-y-2">
              {ROADMAP_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-[#CFD7E8]">
                  <Check className="size-3.5 text-[#7C6DFA]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
