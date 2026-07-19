import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, Bookmark, Share2, ExternalLink, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import { api, type SearchResult } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/dataset/$id")({
  component: DatasetPage,
});

function DatasetPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch dataset detail via search API — there is no single GET /datasets/:id endpoint.
    api.datasets
      .search(id)
      .then((res) => {
        const found = res.results?.find((r: SearchResult) => r.id === id);
        if (found) setD(found);
      })
      .catch((err) => { toast.error(err instanceof Error ? err.message : "Failed to load dataset"); })
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!user) { navigate({ to: "/auth", search: { redirect: `/dataset/${id}`, mode: "login" } }); return; }
    if (!d) return;
    try {
      await api.savedDatasets.upsert({ dataset_id: d.id, dataset_snapshot: JSON.parse(JSON.stringify(d)) });
      toast.success("Saved to your library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!d) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
          <Link to="/search" search={{ q: "" }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to results
          </Link>
          <div className="mt-10 text-center text-muted-foreground">Dataset not found.</div>
        </div>
      </AppShell>
    );
  }

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
              {d.verified && (
                <span className="inline-flex items-center gap-1 text-cyan"><CheckCircle2 className="h-3 w-3" /> Verified {d.verified}</span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{d.name}</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{d.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
                <Download className="h-3.5 w-3.5" /> Download{d.size ? ` ${d.size}` : ""}
              </button>
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm hover:bg-white/10"><Bookmark className="h-3.5 w-3.5" /> Save</button>
              <button className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm hover:bg-white/10"><Share2 className="h-3.5 w-3.5" /> Share</button>
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm hover:bg-white/10">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in {d.repo}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section title="Metadata">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {[
                  ["Modality", d.modality], ["Brain region", d.region], ["Species", d.species],
                  ["Age group", d.ageGroup], ["Disease", d.disease], ["Subjects", d.subjects?.toString()],
                  ["License", d.license], ["Access tier", d.access], ["Size", d.size],
                ].filter(([, v]) => v != null && v !== "" && v !== "null").map(([k, v]) => (
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
                {" "}{d.repo}.{d.doi ? ` doi:${d.doi}` : ""}
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
                  {d.verified && <div className="text-[11px] text-muted-foreground">Last verified {d.verified}</div>}
                </div>
              </div>
            </Section>
            <Section title="Access">
              <div className="text-sm">
                <div className="flex justify-between py-1"><span className="text-muted-foreground">License</span><span>{d.license ?? "—"}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">Tier</span><span>{d.access ?? "—"}</span></div>
                {d.doi && <div className="flex justify-between py-1"><span className="text-muted-foreground">DOI</span><span className="truncate max-w-[160px] font-mono text-xs">{d.doi}</span></div>}
              </div>
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
