import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { datasets } from "@/lib/mock-data";
import { ArrowLeft, CheckCircle2, Download, Bookmark, Share2, ExternalLink, FileText } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/dataset/$id")({
  loader: ({ params }) => {
    const d = datasets.find((x) => x.id === params.id) ?? datasets[0];
    if (!d) throw notFound();
    return { dataset: d };
  },
  component: DatasetPage,
});

function DatasetPage() {
  const { dataset: d } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const save = async () => {
    if (!user) { navigate({ to: "/auth", search: { redirect: `/dataset/${d.id}`, mode: "login" } }); return; }
    try {
      await api.savedDatasets.upsert({ dataset_id: d.id, dataset_snapshot: JSON.parse(JSON.stringify(d)) });
      toast.success("Saved to your library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <Link to="/search" search={{ q: "" }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to results
        </Link>

        {/* Hero */}
        <div className="relative mt-6 overflow-hidden rounded-3xl glass-strong card-elevated">
          <div className="relative h-48 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.28_0.1_240)] via-[oklch(0.24_0.09_285)] to-[oklch(0.22_0.06_200)]" />
            <svg viewBox="0 0 800 200" className="absolute inset-0 h-full w-full opacity-60">
              <defs>
                <linearGradient id="wave" x1="0" x2="1"><stop offset="0" stopColor="oklch(0.86 0.15 200)" /><stop offset="1" stopColor="oklch(0.68 0.22 285)" /></linearGradient>
              </defs>
              {Array.from({ length: 20 }).map((_, k) => (
                <path key={k} d={`M0 ${100 + Math.sin(k) * 40} Q200 ${20 + k * 4} 400 ${100 - k * 3} T800 ${80 + k * 5}`} stroke="url(#wave)" strokeWidth="1" fill="none" opacity={0.4 - k * 0.015} />
              ))}
            </svg>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-foreground">{d.repo}</span>
              <span>· {d.id}</span>
              <span className="inline-flex items-center gap-1 text-cyan"><CheckCircle2 className="h-3 w-3" /> Verified {d.verified}</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{d.name}</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{d.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
                <Download className="h-3.5 w-3.5" /> Download {d.size}
              </button>
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm hover:bg-white/10"><Bookmark className="h-3.5 w-3.5" /> Save</button>
              <button className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm hover:bg-white/10"><Share2 className="h-3.5 w-3.5" /> Share</button>
              <a href="#" className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm hover:bg-white/10">
                <ExternalLink className="h-3.5 w-3.5" /> Open in {d.repo}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section title="Metadata">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {[
                  ["Modality", d.modality], ["Brain region", d.region], ["Species", d.species],
                  ["Age group", d.ageGroup], ["Disease", d.disease], ["Subjects", d.subjects.toString()],
                  ["License", d.license], ["Access tier", d.access], ["Size", d.size],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
                    <div className="mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Preview">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-[oklch(0.24_0.08_240)] via-[oklch(0.22_0.06_260)] to-[oklch(0.28_0.1_285)] ring-1 ring-white/10" />
                ))}
              </div>
            </Section>

            <Section title="Citation">
              <div className="rounded-xl bg-white/5 p-4 font-mono text-xs text-muted-foreground">
                Author, A. et al. ({new Date().getFullYear()}). <span className="text-foreground">{d.name}</span>.
                {" "}{d.repo}. doi:{d.doi}
              </div>
            </Section>

            <Section title="Related datasets">
              <div className="grid gap-3 sm:grid-cols-2">
                {datasets.filter((x) => x.id !== d.id).slice(0, 4).map((r) => (
                  <Link key={r.id} to="/dataset/$id" params={{ id: r.id }} className="flex items-start gap-3 rounded-xl bg-white/5 p-3 hover:bg-white/10">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan/40 to-neural/40 text-[10px] font-bold">{r.modality}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.repo} · {r.subjects} subj</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Repository">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan to-electric text-sm font-bold text-[oklch(0.15_0.03_258)]">
                  {d.repo.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{d.repo}</div>
                  <div className="text-[11px] text-muted-foreground">Last verified {d.verified}</div>
                </div>
              </div>
            </Section>
            <Section title="Access">
              <div className="text-sm">
                <div className="flex justify-between py-1"><span className="text-muted-foreground">License</span><span>{d.license}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">Tier</span><span>{d.access}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">DOI</span><span className="truncate max-w-[160px] font-mono text-xs">{d.doi}</span></div>
              </div>
            </Section>
            <Section title="Research papers">
              <ul className="space-y-2 text-sm">
                {["Cortical connectivity in early-stage cohorts", "Cross-site harmonization of multi-modal imaging", "Longitudinal biomarker discovery"].map((p) => (
                  <li key={p} className="flex items-start gap-2 rounded-lg bg-white/5 p-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 text-cyan" />
                    <span className="text-foreground/90">{p}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass card-elevated rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
