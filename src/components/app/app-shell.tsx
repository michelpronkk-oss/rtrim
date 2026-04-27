import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Overview" },
  { href: "/app/install", label: "Install" },
  { href: "/app/projects", label: "Projects" },
  { href: "/app/runs", label: "Runs" },
];

interface AppShellProps {
  children: React.ReactNode;
  active?: string;
}

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-sm font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
              RunTrim
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border border-border rounded-sm px-1 py-0.5">
              beta
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-150",
                active === item.href
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider leading-relaxed">
            The CLI is the product.
            <br />
            The dashboard shows what it did.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <Link href="/" className="text-sm font-bold tracking-tight text-foreground">
            RunTrim
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-sm px-2.5 py-1.5 text-xs transition-colors duration-150",
                  active === item.href
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
