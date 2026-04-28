import Link from "next/link";
import { LayoutGrid, FolderKanban, History, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app",          label: "Overview", icon: LayoutGrid   },
  { href: "/app/install",  label: "Install",  icon: Download     },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/runs",     label: "Runs",     icon: History      },
];

interface AppShellProps {
  children: React.ReactNode;
  active?: string;
}

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#07080F]">
      <div className="mx-auto flex min-h-screen max-w-6xl">

        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-white/7 md:flex">
          <div className="border-b border-white/7 px-5 py-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-[#EEEEF2]">RunTrim</span>
              <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#2E3050]">v1</span>
            </Link>
            <p className="mt-1.5 text-[12px] text-[#2E3050]">CLI-first agent control</p>
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
                    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[#0DDB9E]/8 text-[#0DDB9E]"
                      : "text-[#4A4E72] hover:bg-white/4 hover:text-[#8888A8]"
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", isActive ? "text-[#0DDB9E]" : "")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/7 px-5 py-4">
            <p className="text-[12px] leading-5 text-[#2E3050]">
              The CLI does the work.<br />The dashboard shows the memory.
            </p>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Mobile header */}
          <header className="flex items-center justify-between border-b border-white/7 px-5 py-4 md:hidden">
            <Link href="/" className="text-sm font-bold text-[#EEEEF2]">RunTrim</Link>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded px-2 py-1 text-[12px] font-medium transition-colors",
                    active === item.href
                      ? "bg-[#0DDB9E]/8 text-[#0DDB9E]"
                      : "text-[#4A4E72] hover:text-[#8888A8]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
