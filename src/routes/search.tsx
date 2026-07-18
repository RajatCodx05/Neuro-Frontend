import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, SlidersHorizontal, CheckCircle2, Download, Bookmark, ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import { api, mapDataset } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: SearchResults,
});

const filterGroups: { title: string; opts: string[] }[] = [
  { title: "Dataset Type", opts: ["MRI", "fMRI", "PET", "EEG", "MEG", "iEEG"] },
  { title: "Species", opts: ["Human", "Mouse", "Rat", "Monkey"] },
  { title: "Age", opts: ["Children", "Adult", "Elderly"] },
  { title: "Disease", opts: ["ADHD", "Parkinson's", "Alzheimer's", "Autism", "Stroke", "Epilepsy"] },
  { title: "Repository", opts: ["OpenNeuro", "DANDI", "ADNI", "EBRAINS", "UK Biobank", "NEMAR"] },
  { title: "License", opts: ["CC0", "CC-BY-4.0", "ADNI DUA", "EBRAINS"] },
  { title: "Access Tier", opts: ["Open", "Registered", "Restricted"] },
  { title: "Verified", opts: ["Verified", "Pending"] },
];

// Shape of a result pushed over SSE from the Node/Redis agent pipeline.
type SearchResult = {
  id: string;
  name?: string;
  repo?: string;
  modality?: string;
  description?: string;
  subjects?: number;
  size?: string;
  region?: string;
  species?: string;
  ageGroup?: string;
  disease?: string;
  license?: string;
  access?: string;
  verified?: string;
  doi?: string;
  [key: string]: unknown;
};

function SearchResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q || "resting-state fMRI children ADHD");
  const [open, setOpen] = useState<string[]>(["Dataset Type", "Disease"]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [streaming, setStreaming] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const toggle = (t: string) => setOpen((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t]);

  // ── SSE: open a live search stream whenever search.q changes ───────────────
  useEffect(() => {
    if (!search.q?.trim() || !user) return;

    let cancelled = false;
    esRef.current?.close();
    setResults([]);
    setStreaming(true);
    void (async () => {
      try {
        const response = await api.datasets.search(search.q.trim());
        if (cancelled) return;
        if (response.source === "cache") {
          setResults(response.results);
          setStreaming(false);
          return;
        }
        if (!response.queryId) throw new Error("Search did not return a stream identifier.");
        const es = new EventSource(api.streamUrl(response.queryId), { withCredentials: true });
        esRef.current = es;
        es.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data as string) as { status?: string; datasets?: Record<string, unknown>[]; results?: Record<string, unknown>[] };
            const datasets = payload.datasets ?? payload.results;
            if (datasets) setResults(datasets.map(mapDataset));
            if (payload.status === "timeout") setStreaming(false);
          } catch { /* ignore malformed stream frames */ }
        };
        es.onerror = () => { es.close(); if (!cancelled) setStreaming(false); };
      } catch (err) {
        if (!cancelled) { toast.error(err instanceof Error ? err.message : "Search failed"); setStreaming(false); }
      }
    })();
    return () => { cancelled = true; esRef.current?.close(); esRef.current = null; };

    // Log search to history if user is signed in (fire-and-forget, identical to before)
    // Close any previous stream
    // GET VITE_API_BASE_URL/search/stream?q=<query>  (EventSource with credentials)
    // TODO: confirm Node SSE path
    es.onmessage = (event) => {
      try {
        const item = JSON.parse(event.data as string) as SearchResult;
        setResults((prev) => [...prev, item]);
      } catch {
        // malformed frame — skip
      }
    };

    es.onerror = () => {
      // Server closed the connection (normal end-of-stream) or network error.
      // Either way, stop the loading indicator.
      es.close();
      esRef.current = null;
      setStreaming(false);
    };

    return () => {
      es.close();
      esRef.current = null;
      setStreaming(false);
    };
  }, [search.q, user]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/search?q=${encodeURIComponent(q)}`, mode: "login" } });
      return;
    }
    navigate({ to: "/search", search: { q } as never });
  };

  const saveDataset = async (d: SearchResult) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/search", mode: "login" } });
      return;
    }
    try {
      await api.savedDatasets.upsert({ dataset_id: d.id, dataset_snapshot: d });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {/* Search bar */}
        <form onSubmit={submit} className="relative">
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-cyan/40 to-neural/40 opacity-40 blur-xl" />
          <div className="relative glass-strong flex items-center gap-2 rounded-3xl p-2">
            <Sparkles className="ml-3 h-4 w-4 text-cyan" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              onFocus={() => { if (!user) navigate({ to: "/auth", search: { redirect: "/search", mode: "login" } }); }}
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none sm:text-base" />
            <button type="button" className="hidden items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex">
              <SlidersHorizontal className="h-3 w-3" /> Filters
            </button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
              Search
            </button>
          </div>
        </form>

        <div className="mt-3 text-xs text-muted-foreground">
          {streaming ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching live pipeline…
            </span>
          ) : results.length > 0 ? (
            <><span className="text-foreground font-medium">{results.length} datasets</span> found</>
          ) : search.q ? (
            "No results yet — try a different query"
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside className="glass rounded-2xl p-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between">
              <div className="font-display text-sm font-semibold">Filters</div>
              <button className="text-[11px] text-muted-foreground hover:text-foreground">Reset</button>
            </div>
            <div className="mt-3 space-y-1">
              {filterGroups.map((g) => {
                const isOpen = open.includes(g.title);
                return (
                  <div key={g.title} className="rounded-xl">
                    <button onClick={() => toggle(g.title)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:bg-white/5">
                      {g.title}
                      <ChevronDown className={`h-3 w-3 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-1 px-2 pb-2">
                        {g.opts.map((o) => (
                          <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-white/5">
                            <input type="checkbox" className="h-3.5 w-3.5 accent-cyan" />
                            <span className="text-foreground/90">{o}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Results */}
          <div className="space-y-4">
            {streaming && results.length === 0 && (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {results.map((d, i) => (
              <motion.article key={`${d.id}-${i}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i, 5) * 0.06 }}
                className="glass card-elevated group flex flex-col gap-4 rounded-2xl p-5 sm:flex-row"
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 font-display text-xs font-bold text-white ring-1 ring-white/10">
                  {d.modality ?? "DS"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {d.repo && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-foreground">{d.repo}</span>}
                    {d.verified && <span className="inline-flex items-center gap-1 text-cyan"><CheckCircle2 className="h-3 w-3" /> Verified {d.verified}</span>}
                    {d.license && <><span>·</span><span>{d.license}</span></>}
                    {d.access && <><span>·</span><span>{d.access}</span></>}
                  </div>
                  <Link to="/dataset/$id" params={{ id: d.id }} className="mt-1 block font-display text-lg font-semibold hover:text-cyan">
                    {d.name ?? d.id}
                  </Link>
                  {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {d.subjects != null && <Chip>{d.subjects} subjects</Chip>}
                    {d.size && <Chip>{d.size}</Chip>}
                    {d.region && <Chip>{d.region}</Chip>}
                    {d.species && <Chip>{d.species}</Chip>}
                    {d.ageGroup && <Chip>{d.ageGroup}</Chip>}
                    {d.disease && <Chip>{d.disease}</Chip>}
                  </div>
                </div>
                <div className="flex flex-row gap-2 sm:flex-col">
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_258)]">
                    <Download className="h-3 w-3" /> Download
                  </button>
                  <Link to="/dataset/$id" params={{ id: d.id }} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                    Metadata <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button onClick={() => saveDataset(d)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                    <Bookmark className="h-3 w-3" /> Save
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{children}</span>;
}
