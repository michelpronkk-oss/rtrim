import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";

export default function AccessRejectedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#07071A]">
      <header className="border-b border-white/8 bg-[#07071A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded" />
            <span className="text-[15px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </Link>
          <Link
            href="/app/install"
            className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-[#9699BE] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
          >
            Install CLI
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">

          <div className="mb-6 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Terminal className="size-5 text-[#7F84AE]/70" />
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#4D5070]">
            Access unavailable
          </p>
          <h1 className="mt-2 text-[1.7rem] font-bold tracking-[-0.03em] text-[#EDEEFF]">
            We cannot open dashboard access yet.
          </h1>
          <p className="mt-3 text-[13px] leading-[1.75] text-[#5E6A88]">
            RunTrim cloud access is limited while Agent early access is being rolled out. We are keeping the circle small for now.
          </p>
          <p className="mt-2 text-[13px] leading-[1.75] text-[#5E6A88]">
            You can still use the free local CLI without an account.
          </p>

          <div className="mt-6 rounded-xl border border-white/7 bg-[#0C0C20] px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#4D5070]">Free CLI</p>
            <p className="mt-2 text-[13px] leading-[1.7] text-[#5E6A88]">
              Local-first. No account. Guard your AI coding runs, track history, and save tokens.
            </p>
            <div className="mt-3 flex items-center gap-1 rounded-lg border border-white/8 bg-[#07071A] px-3 py-2.5 font-mono text-[12px] text-[#9E91FF]">
              <span className="text-[#7C6DFA]/55">$&nbsp;</span>npm install -g runtrim
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/app/install"
              className="inline-flex items-center gap-2 rounded-lg bg-[#7C6DFA] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
              style={{ boxShadow: "0 4px 16px rgba(124,109,250,0.28)" }}
            >
              Install free CLI
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-[13px] text-[#A3AEBD] transition-colors hover:border-white/20 hover:text-[#EDEEFF]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
