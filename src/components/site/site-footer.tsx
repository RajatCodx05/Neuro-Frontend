import { Link } from "@tanstack/react-router";
import { Brain, Github, Twitter, Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/5 bg-[oklch(0.14_0.028_255)]/60 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)]">
              <Brain className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
            </span>
            <span className="font-display text-base font-semibold">NeuroSearch AI</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The intelligent discovery layer for open neuroscience. Built for researchers, clinicians and pharmaceutical R&amp;D teams.
          </p>
          <div className="mt-6 flex gap-2">
            {[Github, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { title: "Product", items: ["Search", "Repositories", "AI Assistant", "API", "Changelog"] },
          { title: "Research", items: ["Datasets", "Collections", "Papers", "Guides", "Benchmarks"] },
          { title: "Company", items: ["About", "Careers", "Security", "Contact", "Privacy"] },
        ].map((col) => (
          <div key={col.title}>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{col.title}</div>
            <ul className="mt-4 space-y-2 text-sm">
              {col.items.map((i) => (
                <li key={i}><Link to="/" className="text-foreground/80 hover:text-foreground">{i}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <div>© 2026 NeuroSearch AI · Advancing open brain science</div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
            All repository indexes online
          </div>
        </div>
      </div>
    </footer>
  );
}
