import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Sparkles, SlidersHorizontal, Bookmark, ArrowRight, ChevronDown, Loader2, Check, ExternalLink, RotateCcw, ThumbsUp, ThumbsDown, Info } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import { api, type DatasetReactionSummary, type SearchResult } from "@/lib/api-client";
import { useSearchState } from "@/lib/search-state";
import {
  FILTER_DIMENSIONS,
  FILTER_DIMENSION_LABELS,
  PAGE_SIZE,
  facetDisplayLabel,
  hasAnySelection,
  modalityDisplayLabel,
  parseUrlFilters,
  type FilterDimension,
} from "@/lib/search-filters";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    filters: typeof s.filters === "string" ? s.filters : undefined,
    page: typeof s.page === "string" ? s.page : undefined,
    modality: typeof s.modality === "string" ? s.modality : undefined,
    disease: typeof s.disease === "string" ? s.disease : undefined,
    species: typeof s.species === "string" ? s.species : undefined,
    ageGroup: typeof s.ageGroup === "string" ? s.ageGroup : undefined,
    task: typeof s.task === "string" ? s.task : undefined,
    format: typeof s.format === "string" ? s.format : undefined,
    repository: typeof s.repository === "string" ? s.repository : undefined,
    availability: typeof s.availability === "string" ? s.availability : undefined,
    // Issue 5: region is a first-class filter dimension — it must round-trip
    // through the URL exactly like modality/species so checkboxes are live.
    region: typeof s.region === "string" ? s.region : undefined,
  }),
  component: SearchResults,
});

function SearchResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const {
    mode,
    error,
    hasBaseline,
    originalQuery,
    baselineCount,
    activeFilters,
    displayFilters,
    filteredResults,
    facets,
    conflict,
    restrictHint,
    runSearch,
    expandSearch,
    setActiveFilters,
    markFilterOverride,
    clearFilters,
    reset,
  } = useSearchState();

  const [q, setQ] = useState(search.q || "");
  const [open, setOpen] = useState<string[]>(["modality", "disease", "task"]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<Record<string, DatasetReactionSummary>>({});
  const [msgIndex, setMsgIndex] = useState(0);
  const loadingMessages = [
    "Cooking Datasets for You",
    "Scanning Neural Pathways",
    "Indexing Brain Waves",
  ];

  // v0.3 G1: streaming is driven by the state machine — the pipeline runs only
  // on submit / initial load / explicit "Search entire database".
  const streaming = mode === "searching" || mode === "expanding";

  // Issue 3: the sidebar is CLOSED by default and opens only when the user
  // presses the "Filters" button (which persists `filters=true` in the URL).
  // Filter params alone never force it open.
  const [showFilters, setShowFilters] = useState(() => search.filters === "true");

  const urlFilters = parseUrlFilters(search as unknown as Record<string, unknown>);
  const hasActiveFilters = hasAnySelection(activeFilters);

  // FR-10 pagination: slices of the already-ranked filtered list. Ranking is
  // never recomputed per page; `page` lives in the URL (G7/G8).
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(search.page || "1", 10) || 1), totalPages);
  const pageItems = filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Load dataset reactions whenever the filtered result set changes
  useEffect(() => {
    if (!filteredResults.length) {
      setReactions({});
      return;
    }
    const ids = filteredResults.map((r) => r.id).filter(Boolean);
    if (!ids.length) return;
    api.datasets.reactions.getBatch(ids)
      .then((batch) => setReactions(batch))
      .catch(() => {});
  }, [filteredResults]);

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

  // Sync URL filter params → search state. Filter toggles navigate to a new
  // URL; this effect applies the change LOCALLY — zero backend calls (G1/G2).
  useEffect(() => {
    setActiveFilters(parseUrlFilters(search as unknown as Record<string, unknown>));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.modality, search.disease, search.species, search.ageGroup, search.task, search.format, search.repository, search.availability, search.region]);

  // v0.3 FR-1: the pipeline is invoked ONLY when (a) there is no baseline yet
  // (initial load / shareable URL reload) or (b) the query text changed
  // (submit). Filter param changes are deliberately NOT in this effect's deps.
  useEffect(() => {
    if (!user) return;
    const textQuery = search.q?.trim() || "";
    const urlFilters = parseUrlFilters(search as unknown as Record<string, unknown>);
    const hasAny = textQuery !== "" || hasAnySelection(urlFilters);
    if (!hasAny) {
      if (hasBaseline || mode !== "idle") reset();
      return;
    }
    if (!hasBaseline || textQuery !== originalQuery) {
      runSearch(textQuery, urlFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q, user, hasBaseline, originalQuery, mode, runSearch, reset]);

  // Surface pipeline failures the same way the previous debounced effect did.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

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

  // Local, synchronous filter toggle (FR-2): updates the URL only; the sync
  // effect applies it to the cached baseline. Never triggers a search.
  //
  // The toggle operates on the USER's own selection (`activeFilters`), never on
  // `displayFilters` (which includes parser pre-selection) — otherwise the
  // parser's value would be baked into the URL and could never be removed
  // (Issue 3). Unticking a parser pre-selected value never changes
  // the URL (it was never in it), so the override is recorded explicitly via
  // `markFilterOverride`; once a dimension is overridden, parser intent stops
  // re-selecting it until a new search is executed.
  const toggleFilterOption = (groupId: string, opt: string) => {
    const dim = groupId as FilterDimension;
    const userValues = activeFilters[dim] || [];
    const displayed = displayFilters[dim] || [];
    if (displayed.includes(opt) && !userValues.includes(opt)) {
      // Clicking a parser-pre-ticked checkbox removes the parser's pre-selection.
      markFilterOverride(dim);
      return;
    }
    const updated = userValues.includes(opt)
      ? userValues.filter((x) => x !== opt)
      : [...userValues, opt];

    const nextSearch = {
      ...search,
      [groupId]: updated.length ? updated.join(",") : undefined,
      page: undefined, // FR-10: page resets to 1 when filters change
    };
    navigate({ to: "/search", search: nextSearch as never });
  };

  // FR-9: clearing all filters restores the cached baseline instantly.
  const resetFilters = () => {
    clearFilters();
    navigate({
      to: "/search",
      search: { q: search.q, filters: showFilters ? "true" : undefined } as never,
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim() && !hasAnySelection(urlFilters)) return;
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
        page: undefined, // FR-10: new search resets page
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

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(p, 1), totalPages);
    if (clamped === page) return;
    navigate({ to: "/search", search: { ...search, page: clamped > 1 ? String(clamped) : undefined } as never });
  };

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
                  {Object.values(activeFilters).reduce((acc, curr) => acc + (curr?.length ?? 0), 0)}
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

        {/* AI disclaimer (ChatGPT/Claude-style) */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70">
          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span>
            AI can make mistakes. Please double-check the datasets before use.
          </span>
        </div>

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

        {/* FR-7: conflicting filter selection — never silently re-runs search. */}
        {conflict && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="flex-1 min-w-0 text-amber-100/90">
              Your selection <span className="font-medium text-amber-200">{conflict.values.join(", ")}</span> on{" "}
              <span className="font-medium text-amber-200">{FILTER_DIMENSION_LABELS[conflict.dimension]}</span>{" "}
              conflicts with what the AI understood from your query. Filters apply to the current results only —
              search again to look beyond them?
            </span>
            <button
              onClick={() => void expandSearch()}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_258)]"
            >
              Search again using these filters <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* FR-6: filtered pool at/below the low watermark — explicit expanded search. */}
        {restrictHint && !conflict && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm">
            <Info className="h-4 w-4 shrink-0 text-cyan" />
            <span className="flex-1 min-w-0 text-foreground/90">
              Showing {filteredResults.length} of the original {baselineCount} results. Filters apply to the
              current results only — search the entire database using these filters?
            </span>
            <button
              onClick={() => void expandSearch()}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_258)]"
            >
              Search entire database <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className={`mt-8 grid grid-cols-1 gap-6 ${showFilters ? "lg:grid-cols-[260px_1fr]" : ""}`}>
          {/* Filters Sidebar — dynamic facets (G4): options are derived from the
              cached pool; zero-count options are never rendered. */}
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
                {FILTER_DIMENSIONS.map((dim) => {
                  const groupFacets = facets[dim] ?? [];
                  // Always keep currently-selected values visible so they can be unticked
                  // even when another group's selection drops their count to zero. `displayFilters`
                  // (user selection + parser pre-selection, minus user overrides) drives the
                  // checkbox state — parser intent is display-only (Issue 1/3).
                  const selected = displayFilters[dim] ?? [];
                  const options = [...groupFacets];
                  for (const v of selected) {
                    if (!options.some((o) => o.value === v)) options.push({ value: v, count: 0 });
                  }
                  if (options.length === 0) return null;
                  const isOpen = open.includes(dim);
                  return (
                    <div key={dim} className="rounded-xl">
                      <button
                        onClick={() => toggleGroup(dim)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5"
                      >
                        <span className="flex items-center gap-2">
                          {FILTER_DIMENSION_LABELS[dim]}
                          {selected.length > 0 && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                          )}
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="space-y-1 px-2 pb-2 pt-1">
                          {options.map((f) => {
                            const isChecked = selected.includes(f.value);
                            return (
                              <label
                                key={f.value}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-white/5 [.light_&]:hover:bg-black/5"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleFilterOption(dim, f.value)}
                                  className="h-3.5 w-3.5 rounded border-white/20 accent-cyan cursor-pointer"
                                />
                                <span className={isChecked ? "font-medium text-cyan" : "text-foreground/90"}>
                                  {dim === "modality" ? modalityDisplayLabel(f.value) : facetDisplayLabel(f.value)}
                                </span>
                                <span className="ml-auto text-[10px] font-medium text-muted-foreground">{f.count}</span>
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
            {pageItems.map((d, i) => (
              <motion.article
                key={`${d.id}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i, 5) * 0.06 }}
                className="glass card-elevated group flex flex-col gap-4 rounded-2xl p-5 sm:flex-row"
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 font-display text-xs font-bold text-white ring-1 ring-white/10">
                    {modalityDisplayLabel(d.modality ?? "DS")}
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
                    {d.license && <><span>·</span><span>{d.license}</span></>}
                    {(d.access || d.access_tier) && <><span>·</span><span>{d.access || d.access_tier}</span></>}
                  </div>
                  <Link to="/dataset/$id" params={{ id: d.id }} target="_blank" className="mt-1 block font-display text-lg font-semibold hover:text-cyan">
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
                  <Link to="/dataset/$id" params={{ id: d.id }} target="_blank" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-1.5 text-xs hover:bg-white/10 [.light_&]:hover:bg-black/[0.08]">
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

            {/* FR-10 pagination — reuses the existing (previously unused) component */}
            {totalPages > 1 && (
              <Pagination className="pt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => { e.preventDefault(); goToPage(page - 1); }}
                      className={page <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={(e) => { e.preventDefault(); goToPage(p); }}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => { e.preventDefault(); goToPage(page + 1); }}
                      className={page >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
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
