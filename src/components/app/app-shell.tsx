import Link from "next/link";
import { LayoutGrid, FolderKanban, History, Download, ShieldCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: LayoutGrid, hint: "Where you left off" },
  { href: "/app/projects", label: "Projects", icon: FolderKanban, hint: "Project memory" },
  { href: "/app/runs", label: "Runs", icon: History, hint: "Investigation log" },
  { href: "/app/install", label: "Install", icon: Download, hint: "Operator workflow" },
];

interface AppShellProps {
  children: React.ReactNode;
  active?: string;
}

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#080D12]">
      <div className="mx-auto flex min-h-screen max-w-[1280px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-white/8 bg-[#0B1118] md:flex">
          <div className="border-b border-white/8 px-5 py-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="rounded-md border border-[#7EE7D8]/30 bg-[#7EE7D8]/10 p-1.5 text-[#7EE7D8]">
                <ShieldCheck className="size-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#F5F7FA]">RunTrim Console</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#7D8A99]">CLI-first agent control</p>
              </div>
            </Link>
          </div>

          <div className="border-b border-white/8 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#6D7B8C]">Workspace</p>
            <div className="mt-2 rounded-lg border border-white/8 bg-[#0E151E] px-3 py-2.5">
              <p className="text-[13px] font-medium text-[#E4EBF3]">rtrim</p>
              <p className="mt-0.5 text-[12px] text-[#97A5B5]">Example local project state</p>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-[#97A5B5]">
              <RefreshCw className="size-3.5" />
              <span>Sync status shown per page</span>
            </div>
          </div>

          <nav className="flex-1 px-3 py-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mb-1 block rounded-lg border px-3 py-2.5 transition-colors",
                    isActive
                      ? "border-[#7EE7D8]/25 bg-[#7EE7D8]/8"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("size-3.5", isActive ? "text-[#7EE7D8]" : "text-[#8E9CAC]")} />
                    <span className={cn("text-[13px] font-medium", isActive ? "text-[#E7F4F2]" : "text-[#A3B0BF]")}>{item.label}</span>
                  </div>
                  <p className="mt-1 pl-6 text-[11px] text-[#6D7B8C]">{item.hint}</p>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/8 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#6D7B8C]">Privacy</p>
            <p className="mt-1 text-[12px] leading-5 text-[#97A5B5]">
              Local-first by default. CLI metadata can sync in private beta. Source code is not uploaded.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B1118]/90 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="text-sm font-semibold text-[#F5F7FA]">RunTrim</Link>
              <nav className="flex gap-1 overflow-x-auto">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "whitespace-nowrap rounded-md px-2 py-1 text-[12px]",
                      active === item.href ? "bg-[#7EE7D8]/10 text-[#9AEFE3]" : "text-[#9AA7B6]"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
