import Link from "next/link";
import { LayoutGrid, FolderKanban, History, Download, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app",          label: "Overview",  icon: LayoutGrid   },
  { href: "/app/projects", label: "Projects",  icon: FolderKanban },
  { href: "/app/runs",     label: "Runs",      icon: History      },
  { href: "/app/settings", label: "Settings",  icon: SlidersHorizontal },
  { href: "/app/install",  label: "Install",   icon: Download     },
];

interface AppShellProps {
  children: React.ReactNode;
  active?: string;
}

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#07071A]">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/8 bg-[#08081E] md:flex">

          {/* Wordmark */}
          <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="size-6 rounded-md" />
            <span className="text-[14px] font-bold tracking-tight text-[#EDEEFF]">RunTrim</span>
          </div>

          {/* Workspace */}
          <div className="border-b border-white/8 px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0E1027] px-3 py-2.5">
              <div className="size-1.5 rounded-full bg-[#7C6DFA]" />
              <span className="text-[13px] font-semibold text-[#EDEEFF]">runtrim</span>
              <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#7F84AE]">
                local
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 px-3 py-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-100",
                    isActive
                      ? "border border-[#7C6DFA]/25 bg-[#7C6DFA]/12 text-[#D3CBFF]"
                      : "border border-transparent text-[#7F84AE] hover:border-white/8 hover:bg-white/5 hover:text-[#C3C6E8]"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-[#B2A7FF]" : "text-[#6A6F96]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/8 px-5 py-4">
            <p className="text-[11px] leading-relaxed text-[#6E7399]">
              Local-first control layer.
              <br />
              Sync is optional metadata only.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#626A94]">
              <Link href="/privacy" className="transition-colors hover:text-[#B9B2FF]">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-[#B9B2FF]">Terms</Link>
              <Link href="/security" className="transition-colors hover:text-[#B9B2FF]">Security</Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 bg-[#0A0A1F]">
          {/* Mobile nav */}
          <header className="flex items-center justify-between border-b border-white/8 bg-[#08081E]/90 px-5 py-4 backdrop-blur md:hidden">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="" className="size-5 rounded" />
              <span className="text-sm font-bold text-[#EDEEFF]">RunTrim</span>
            </div>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                    active === item.href
                      ? "bg-[#7C6DFA]/12 text-[#C4B8FF]"
                      : "text-[#4D5070] hover:text-[#9699BE]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="px-5 py-7 sm:px-8 sm:py-10 xl:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
