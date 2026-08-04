import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, SlidersHorizontal, CheckCircle2, Bookmark, ArrowRight, ChevronDown, Loader2, Check, ExternalLink, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import { api, type DatasetReactionSummary } from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    filters: typeof s.filters === "string" ? s.filters : undefined,
    modality: typeof s.modality === "string" ? s.modality : undefined,
    disease: typeof s.disease === "string" ? s.disease : undefined,
    species: typeof s.species === "string" ? s.species : undefined,
    ageGroup: typeof s.ageGroup === "string" ? s.ageGroup : undefined,
    task: typeof s.task === "string" ? s.task : undefined,
    format: typeof s.format === "string" ? s.format : undefined,
    repository: typeof s.repository === "string" ? s.repository : undefined,
    availability: typeof s.availability === "string" ? s.availability : undefined,
  }),
  component: SearchResults,
});

type FilterGroup = {
  id: string;
  title: string;
  opts: string[];
};

const filterGroups: FilterGroup[] = [
  { id: "modality", title: "Modality", opts: ["MRI", "fMRI", "PET", "EEG", "MEG", "iEEG"] },
  { id: "disease", title: "Disease / Condition", opts: ["ADHD", "Parkinson's", "Alzheimer's", "Autism", "Stroke", "Epilepsy"] },
  { id: "species", title: "Species", opts: ["Human", "Mouse", "Rat", "Monkey"] },
  { id: "ageGroup", title: "Age Group", opts: ["Pediatric", "Adult", "Older Adult"] },
  { id: "task", title: "Experimental Task", opts: ["Resting-state", "Motor", "Memory", "Language", "Visual", "Auditory"] },
  { id: "format", title: "Data Format", opts: ["BIDS", "NIfTI", "DICOM", "MNE"] },
  { id: "repository", title: "Repository", opts: ["OpenNeuro", "DANDI", "ADNI", "EBRAINS", "UK Biobank", "NEMAR"] },
  { id: "availability", title: "Availability", opts: ["Open", "Registered", "Restricted"] },
];

type SearchResult = {
  id: string;
  name?: string;
  repo?: string;
  source?: string;
  modality?: string;
  description?: string;
  subjects?: number | null;
  size?: string | null;
  region?: string | null;
  species?: string | null;
  ageGroup?: string | null;
  disease?: string | null;
  license?: string | null;
  access?: string | null;
  access_tier?: string | null;
  verified?: string | null;
  doi?: string | null;
  url?: string | null;
  [key: string]: unknown;
};

function SearchResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [q, setQ] = useState(search.q || "");
  const [open, setOpen] = useState<string[]>(["modality", "disease", "task"]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Record<string, DatasetReactionSummary>>({});
  const [showFilters, setShowFilters] = useState(Boolean(search.filters === "true" || Object.keys(search).some((k) => k !== "q" && k !== "filters")));
  const [msgIndex, setMsgIndex] = useState(0);
  const loadingMessages = [
    "Cooking Datasets for You",
    "Scanning Neural Pathways",
    "Indexing Brain Waves",
  ];

  // Load dataset reactions whenever search results change
  useEffect(() => {
    if (!results.length) {
      setReactions({});
      return;
    }
    const ids = results.map((r) => r.id).filter(Boolean);
    if (!ids.length) return;
    api.datasets.reactions.getBatch(ids)
      .then((batch) => setReactions(batch))
      .catch(() => {});
  }, [results]);

  // Rotate loading messages every 1 second while streaming
  useEffect(() => {
    if (!streaming) {
      setMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [streaming]);

  const parseFilter = (v?: string): string[] => (v ? v.split(",").filter(Boolean) : []);
  const activeFilters: Record<string, string[]> = {
    modality: parseFilter(search.modality),
    disease: parseFilter(search.disease),
    species: parseFilter(search.species),
    ageGroup: parseFilter(search.ageGroup),
    task: parseFilter(search.task),
    format: parseFilter(search.format),
    repository: parseFilter(search.repository),
    availability: parseFilter(search.availability),
  };

  const hasActiveFilters = Object.values(activeFilters).some((arr) => arr.length > 0);

  // Sync text input when URL search query changes externally
  useEffect(() => {
    setQ(search.q || "");
  }, [search.q]);

  // Load saved datasets
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    api.savedDatasets.list()
      .then((list) => {
        setSavedIds(new Set(list.map((item) => item.dataset_id)));
      })
      .catch(() => {});
  }, [user]);

  const toggleGroup = (id: string) => setOpen((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleFilterOption = (groupId: string, opt: string) => {
    const current = activeFilters[groupId] || [];
    const updated = current.includes(opt) ? current.filter((x) => x !== opt) : [...current, opt];

    const nextSearch = {
      ...search,
      [groupId]: updated.length ? updated.join(",") : undefined,
    };
    navigate({ to: "/search", search: nextSearch as never });
  };

  const resetFilters = () => {
    navigate({
      to: "/search",
      search: { q: search.q, filters: showFilters ? "true" : undefined } as never,
    });
  };

  // Search execution hook (runs when text or filters change)
  useEffect(() => {
    const activeTextQuery = search.q?.trim() || "";
    if (!activeTextQuery && !hasActiveFilters) {
      setResults([]);
      setStreaming(false);
      return;
    }
    if (!user) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setResults([]);
      setStreaming(true);
      void (async () => {
        try {
          const response = await api.datasets.search(activeTextQuery, activeFilters);
          if (cancelled) return;
          setResults(response.results ?? []);
        } catch (err) {
          if (!cancelled) toast.error(err instanceof Error ? err.message : "Search failed");
        } finally {
          if (!cancelled) setStreaming(false);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    search.q,
    search.modality,
    search.disease,
    search.species,
    search.ageGroup,
    search.task,
    search.format,
    search.repository,
    search.availability,
    user,
  ]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim() && !hasActiveFilters) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/search?q=${encodeURIComponent(q.trim())}`, mode: "login" } });
      return;
    }
    navigate({
      to: "/search",
      search: {
        ...search,
        q: q.trim(),
        filters: showFilters ? "true" : undefined,
      } as never,
    });
  };

  const saveDataset = async (d: SearchResult) => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/search", mode: "login" } });
      return;
    }
    if (savedIds.has(d.id)) {
      toast.error("Dataset already saved");
      return;
    }
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.add(d.id);
      return next;
    });
    try {
      await api.savedDatasets.upsert({ dataset_id: d.id, dataset_snapshot: d });
      toast.success("Saved");
    } catch (err) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleReaction = async (datasetId: string, reaction: "like" | "dislike") => {
    const current = reactions[datasetId] || { datasetId, likes: 0, dislikes: 0, userReaction: null };
    const prevReaction = current.userReaction;

    let newReaction: "like" | "dislike" | null = reaction;
    let newLikes = current.likes;
    let newDislikes = current.dislikes;

    if (prevReaction === reaction) {
      newReaction = null;
      if (reaction === "like") newLikes = Math.max(0, newLikes - 1);
      if (reaction === "dislike") newDislikes = Math.max(0, newDislikes - 1);
    } else {
      if (prevReaction === "like") newLikes = Math.max(0, newLikes - 1);
      if (prevReaction === "dislike") newDislikes = Math.max(0, newDislikes - 1);

      if (reaction === "like") newLikes += 1;
      if (reaction === "dislike") newDislikes += 1;
    }

    setReactions((prev) => ({
      ...prev,
      [datasetId]: { datasetId, likes: newLikes, dislikes: newDislikes, userReaction: newReaction },
    }));

    try {
      const updated = await api.datasets.reactions.toggle(datasetId, newReaction);
      setReactions((prev) => ({ ...prev, [datasetId]: updated }));
    } catch (err) {
      setReactions((prev) => ({ ...prev, [datasetId]: current }));
      toast.error(err instanceof Error ? err.message : "Reaction failed");
    }
  };

  // Client-side real-time result filter matching
  const filteredResults = results.filter((d) => {
    if (!hasActiveFilters) return true;
    for (const [groupId, selected] of Object.entries(activeFilters)) {
      if (!selected || selected.length === 0) continue;
      const lowerSelected = selected.map((s) => s.toLowerCase());

      if (groupId === "modality") {
        const m = String(d.modality || "").toLowerCase();
        if (!lowerSelected.some((val) => m.includes(val))) return false;
      } else if (groupId === "disease") {
        const dis = String(d.disease || "").toLowerCase();
        const desc = String(d.description || "").toLowerCase();
        if (!lowerSelected.some((val) => dis.includes(val) || desc.includes(val))) return false;
      } else if (groupId === "species") {
        const sp = String(d.species || "").toLowerCase();
        if (!lowerSelected.some((val) => sp.includes(val))) return false;
      } else if (groupId === "ageGroup") {
        const ag = String(d.ageGroup || "").toLowerCase();
        if (!lowerSelected.some((val) => ag.includes(val))) return false;
      } else if (groupId === "task" || groupId === "format") {
        const desc = String(d.description || "").toLowerCase();
        const name = String(d.name || "").toLowerCase();
        if (!lowerSelected.some((val) => desc.includes(val) || name.includes(val))) return false;
      } else if (groupId === "repository") {
        const repo = String(d.repo || d.source || "").toLowerCase();
        if (!lowerSelected.some((val) => repo.includes(val))) return false;
      } else if (groupId === "availability") {
        const acc = String(d.access || d.access_tier || "").toLowerCase();
        if (!lowerSelected.some((val) => acc.includes(val))) return false;
      }
    }
    return true;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {/* Search bar */}
        <form onSubmit={submit} className="relative">
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-cyan/40 to-neural/40 opacity-40 blur-xl" />
          <div className="relative glass-strong flex items-center gap-2 rounded-3xl p-2">
            <Sparkles className="ml-3 h-4 w-4 text-cyan" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => {
                if (!user) navigate({ to: "/auth", search: { redirect: "/search", mode: "login" } });
              }}
              placeholder="Start Searching Datasets (eg: resting-state fMRI children ADHD)"
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:placeholder:opacity-40 sm:text-base"
            />
            <button
              type="button"
              onClick={() => {
                const nextShow = !showFilters;
                setShowFilters(nextShow);
                navigate({
                  to: "/search",
                  search: {
                    ...search,
                    filters: nextShow ? "true" : undefined,
                  } as never,
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                showFilters
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] text-muted-foreground [.light_&]:text-foreground/80 hover:text-foreground hover:border-cyan/40"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" /> Filters
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan text-[10px] font-bold text-slate-950">
                  {Object.values(activeFilters).reduce((acc, curr) => acc + curr.length, 0)}
                </span>
              )}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {streaming ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> {loadingMessages[msgIndex]}
                <AnimatedDots />
              </span>
            ) : filteredResults.length > 0 ? (
              <>
                <span className="font-medium text-foreground">{filteredResults.length} datasets</span> found
              </>
            ) : search.q || hasActiveFilters ? (
              "No results found for current query and active filters"
            ) : null}
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="inline-flex items-center gap-1 text-xs text-cyan hover:underline">
              <RotateCcw className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>

        <div className={`mt-8 grid grid-cols-1 gap-6 ${showFilters ? "lg:grid-cols-[260px_1fr]" : ""}`}>
          {/* Filters Sidebar */}
          {showFilters && (
            <aside className="glass rounded-2xl p-4 lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 [.light_&]:border-black/10">
                <div className="font-display text-sm font-semibold">Filters</div>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-[11px] text-cyan hover:underline inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {filterGroups.map((g) => {
                  const isOpen = open.includes(g.id);
                  const selectedOpts = activeFilters[g.id] || [];
                  return (
                    <div key={g.id} className="rounded-xl">
                      <button
                        onClick={() => toggleGroup(g.id)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5"
                      >
                        <span className="flex items-center gap-2">
                          {g.title}
                          {selectedOpts.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                          )}
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="space-y-1 px-2 pb-2 pt-1">
                          {g.opts.map((o) => {
                            const isChecked = selectedOpts.includes(o);
                            return (
                              <label
                                key={o}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-white/5 [.light_&]:hover:bg-black/5"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleFilterOption(g.id, o)}
                                  className="h-3.5 w-3.5 rounded border-white/20 accent-cyan cursor-pointer"
                                />
                                <span className={isChecked ? "font-medium text-cyan" : "text-foreground/90"}>
                                  {o}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Results List */}
          <div className="space-y-4">
            {streaming && filteredResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="mt-4 text-sm">
                  {loadingMessages[msgIndex]}
                  <AnimatedDots />
                </span>
              </div>
            )}
            {filteredResults.map((d, i) => (
              <motion.article
                key={`${d.id}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i, 5) * 0.06 }}
                className="glass card-elevated group flex flex-col gap-4 rounded-2xl p-5 sm:flex-row"
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 font-display text-xs font-bold text-white ring-1 ring-white/10">
                    {d.modality ?? "DS"}
                  </div>
                  {/* Like & Dislike buttons positioned on the left under modality avatar */}
                  <div className="flex w-16 items-center justify-between gap-1">
                    <button
                      onClick={() => handleReaction(d.id, "like")}
                      className={`flex-1 inline-flex items-center justify-center gap-0.5 rounded-full border px-1 py-0.5 text-[10px] font-medium transition-colors ${
                        reactions[d.id]?.userReaction === "like"
                          ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-400"
                          : "border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      }`}
                      title="Like dataset"
                    >
                      <ThumbsUp className="h-3 w-3" />
                      <span>{reactions[d.id]?.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => handleReaction(d.id, "dislike")}
                      className={`flex-1 inline-flex items-center justify-center gap-0.5 rounded-full border px-1 py-0.5 text-[10px] font-medium transition-colors ${
                        reactions[d.id]?.userReaction === "dislike"
                          ? "border-rose-500/50 bg-rose-500/15 text-rose-400"
                          : "border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      }`}
                      title="Dislike dataset"
                    >
                      <ThumbsDown className="h-3 w-3" />
                      <span>{reactions[d.id]?.dislikes || 0}</span>
                    </button>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {/* {d.verified && (
                      <span className="inline-flex items-center gap-1 text-cyan">
                        <CheckCircle2 className="h-3 w-3" /> Verified {d.verified}
                      </span>
                    )} */}
                    {/* {d.repo && <span className="rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-2 py-0.5 text-foreground">{d.repo}</span>} */}
                    {/* {d.verified && <span className="inline-flex items-center gap-1 text-cyan"><CheckCircle2 className="h-3 w-3" /> Verified {d.verified}</span>} */}
                    {d.license && <><span>·</span><span>{d.license}</span></>}
                    {(d.access || d.access_tier) && <><span>·</span><span>{d.access || d.access_tier}</span></>}
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
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_258)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Access the Data
                    </a>
                  ) : (
                    <button disabled className="inline-flex items-center justify-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400 cursor-not-allowed">
                      <ExternalLink className="h-3.5 w-3.5" /> Access the Data
                    </button>
                  )}
                  <Link to="/dataset/$id" params={{ id: d.id }} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-1.5 text-xs hover:bg-white/10 [.light_&]:hover:bg-black/[0.08]">
                    Expand <ArrowRight className="h-3 w-3" />
                  </Link>
                  {savedIds.has(d.id) ? (
                    <button disabled className="inline-flex items-center justify-center gap-1.5 rounded-full border border-green-500/30 px-3 py-1.5 text-xs text-green-500 bg-green-500/5 cursor-default">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </button>
                  ) : (
                    <button onClick={() => saveDataset(d)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-1.5 text-xs hover:bg-white/10 [.light_&]:hover:bg-black/[0.08]">
                      <Bookmark className="h-3.5 w-3.5" /> Save
                    </button>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-flex items-center gap-[1.5px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-[3px] w-[3px] rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.2}s`, animationDuration: "0.6s" }}
        />
      ))}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/[0.04] [.light_&]:bg-black/[0.04] px-2 py-0.5">{children}</span>;
}
