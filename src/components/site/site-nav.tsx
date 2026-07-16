import { Link } from "@tanstack/react-router";
import { Bell, Search, Brain } from "lucide-react";

const nav = [
  { label: "Home", to: "/" },
  { label: "Repositories", to: "/" },
  { label: "Datasets", to: "/search" },
  { label: "Research Tools", to: "/" },
  { label: "Documentation", to: "/docs" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
] as const;

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-3 max-w-7xl px-4">
        <div className="glass-strong flex items-center justify-between rounded-full px-3 py-2 sm:px-4">
          <Link to="/" className="flex items-center gap-2 pl-1 pr-3">
            <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] glow-cyan">
              <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              NeuroSearch <span className="text-cyan">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to as string}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                activeProps={{ className: "rounded-full px-3 py-1.5 text-sm text-foreground bg-white/5" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <Search className="h-4 w-4" />
            </button>
            <button className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan" />
            </button>
            <Link
              to="/"
              className="ml-1 hidden rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-1.5 text-sm font-medium text-[oklch(0.15_0.03_258)] transition hover:opacity-90 sm:inline-flex"
            >
              Launch app
            </Link>
            <div className="ml-1 h-8 w-8 rounded-full bg-gradient-to-br from-neural to-electric ring-1 ring-white/10" />
          </div>
        </div>
      </div>
    </header>
  );
}
