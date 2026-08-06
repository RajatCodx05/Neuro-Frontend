/**
 * search-state.tsx — search state layer (v0.3 §8.2/§8.3).
 *
 * Owns the immutable ranked baseline ("Search ≠ Filter"):
 *   - `pool`          raw ranked results from the last pipeline run (immutable
 *                     for the lifetime of a baseline; replaced ONLY by a new
 *                     pipeline run — initial search or "Search entire database")
 *   - `parsedIntent`  parser-derived dimensions from the last response (FR-8/FR-7)
 *   - `activeFilters` user selection, synchronized from the URL by the route
 *   - `appliedFilters` user selection MINUS the filters the backend already
 *                     applied when the pool was built (never includes parser
 *                     intent — the backend already filtered by it; Issue 1)
 *   - `displayFilters` user selection + parser pre-selection minus user
 *                     overrides (checkbox display only, FR-8/Issue 3)
 *   - `filteredResults` / `facets` derived synchronously by the single engine
 *
 * Filter toggles, clearing, and pagination NEVER call the backend (G1). The
 * only network paths are `runSearch` (query submit / initial load with filters
 * and no baseline) and `expandSearch` (explicit "Search entire database").
 *
 * Mounted above the routes (see __root.tsx) so the baseline survives
 * navigation between /search and /dataset/:id (doc §8.3). On a hard reload
 * with no cache the route re-runs the initial search from the URL (FR-11).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, mapDataset, type SearchResult } from "./api-client";
import {
  applyFilters,
  computeFacets,
  mergeFilters,
  normalizeDimensions,
  valuesOverlap,
  LOW_WATERMARK,
  FILTER_DIMENSIONS,
  type ActiveFilters,
  type FacetMap,
  type FilterDimension,
  type RawDataset,
} from "./search-filters";

export type SearchMode = "idle" | "searching" | "loaded" | "expanding" | "error";

export type ConflictState = { dimension: FilterDimension; values: string[] } | null;

type SearchResponse = {
  source: string;
  rawResults?: RawDataset[];
  filters?: Record<string, unknown>;
};

export type SearchState = {
  mode: SearchMode;
  error: string | null;
  originalQuery: string;
  hasBaseline: boolean;
  baselineCount: number;
  activeFilters: ActiveFilters;
  /** User selection minus what the backend already applied when the pool was built. */
  appliedFilters: ActiveFilters;
  /** Parser pre-selection for facet checkboxes (FR-8) — display ONLY, never applied to the pool. */
  displayFilters: ActiveFilters;
  parsedIntent: ActiveFilters | null;
  filteredResults: SearchResult[];
  facets: FacetMap;
  conflict: ConflictState;
  restrictHint: boolean;
  runSearch: (query: string, filters: ActiveFilters) => void;
  expandSearch: () => void;
  setActiveFilters: (filters: ActiveFilters) => void;
  /** Record a user interaction on a dimension so parser pre-selection stops applying to it (Issue 3). */
  markFilterOverride: (dimension: FilterDimension) => void;
  clearFilters: () => void;
  reset: () => void;
};

const SearchStateContext = createContext<SearchState | null>(null);

/** True when two per-dimension selections hold the same values (order-insensitive). */
function sameSelection(a: string[] | undefined, b: string[] | undefined): boolean {
  const listA = a ?? [];
  const listB = b ?? [];
  return (
    listA.length === listB.length &&
    listA.every((v) => listB.includes(v)) &&
    listB.every((v) => listA.includes(v))
  );
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SearchMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalQuery, setOriginalQuery] = useState("");
  const [pool, setPool] = useState<RawDataset[]>([]);
  const [resultSource, setResultSource] = useState("");
  const [parsedIntent, setParsedIntent] = useState<ActiveFilters | null>(null);
  const [activeFilters, setActiveFiltersState] = useState<ActiveFilters>({});
  // Dimensions the user explicitly interacted with since this baseline was
  // loaded — for those, parser pre-selection (FR-8) is suppressed so a
  // pre-ticked value can be unticked.
  const [overrides, setOverrides] = useState<ReadonlySet<FilterDimension>>(new Set());
  // The explicit filters that were sent to the backend when the current pool
  // was produced. The backend ALREADY applied those (and its parser intent)
  // when building the pool, so re-applying the same selection client-side with
  // this stricter structured-field engine would drop legitimate results that
  // the backend matched via free text (Issue 1). Only selections the backend
  // did NOT see (i.e. toggled after the baseline loaded) are applied locally.
  const [baselineFilters, setBaselineFilters] = useState<ActiveFilters>({});

  const queryRef = useRef("");
  const activeFiltersRef = useRef<ActiveFilters>({});
  activeFiltersRef.current = activeFilters;
  const prevActiveRef = useRef<ActiveFilters>({});
  queryRef.current = originalQuery;
  // Monotonic request sequence: a pipeline response is applied only if it is
  // still the latest request (guards against stale responses overwriting a
  // newer baseline when searches overlap — same guarantee the old effect's
  // `cancelled` flag provided).
  const requestSeq = useRef(0);

  /** Store a resolved pipeline response as the new baseline (§FR-6 replaces the baseline). */
  const applySearchResponse = useCallback((query: string, response: SearchResponse) => {
    queryRef.current = query;
    setOriginalQuery(query);
    setPool(response.rawResults ?? []);
    setResultSource(response.source ?? "");
    setParsedIntent(normalizeDimensions(response.filters));
    setOverrides(new Set()); // fresh baseline → parser pre-selection re-applies
    setMode("loaded");
    setError(null);
  }, []);

  const runSearch = useCallback(
    async (query: string, filters: ActiveFilters) => {
      const seq = ++requestSeq.current;
      setMode("searching");
      setError(null);
      setPool([]);
      setParsedIntent(null);
      setOriginalQuery(query);
      queryRef.current = query;
      try {
        const response = await api.datasets.search(query, filters);
        if (seq !== requestSeq.current) return; // superseded by a newer request
        // The backend applied exactly `filters` (plus its parser intent) to
        // produce this pool — never re-apply them client-side (Issue 1).
        setBaselineFilters(filters);
        applySearchResponse(query, response);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : "Search failed");
        setMode("error");
      }
    },
    [applySearchResponse],
  );

  /** Explicit "Search entire database": re-run the pipeline with the original query + current selection. */
  const expandSearch = useCallback(async () => {
    const seq = ++requestSeq.current;
    setMode("expanding");
    setError(null);
    try {
      const response = await api.datasets.search(queryRef.current, activeFiltersRef.current);
      if (seq !== requestSeq.current) return; // superseded by a newer request
      // The expanded search ran WITH the current selection, so the new pool
      // already reflects it — no client-side re-application (Issue 1).
      setBaselineFilters(activeFiltersRef.current);
      applySearchResponse(queryRef.current, response);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : "Search failed");
      setMode("error");
    }
  }, [applySearchResponse]);

  /** Sync user selection from the URL; dimensions that changed become user-overridden. */
  const setActiveFilters = useCallback((filters: ActiveFilters) => {
    const prev = prevActiveRef.current;
    if (
      Object.keys(prev).every((k) =>
        sameSelection(prev[k as FilterDimension], filters[k as FilterDimension]),
      ) &&
      Object.keys(filters).every((k) =>
        sameSelection(prev[k as FilterDimension], filters[k as FilterDimension]),
      )
    ) {
      return;
    }
    const allDims = new Set([
      ...Object.keys(prev),
      ...Object.keys(filters),
    ]) as Set<FilterDimension>;
    const changed: FilterDimension[] = [];
    for (const dim of allDims) {
      if (!sameSelection(prev[dim], filters[dim])) changed.push(dim);
    }
    if (changed.length > 0) {
      setOverrides((o) => {
        const next = new Set(o);
        changed.forEach((d) => next.add(d));
        return next;
      });
    }
    prevActiveRef.current = filters;
    setActiveFiltersState(filters);
  }, []);

  /** FR-9: clearing all filters restores the cached baseline instantly (no pipeline call). */
  const clearFilters = useCallback(() => {
    setOverrides(new Set(FILTER_DIMENSIONS));
    prevActiveRef.current = {};
    setActiveFiltersState({});
  }, []);

  const reset = useCallback(() => {
    requestSeq.current += 1; // invalidate any in-flight request
    setMode("idle");
    setError(null);
    setPool([]);
    setResultSource("");
    setParsedIntent(null);
    setActiveFiltersState({});
    setOverrides(new Set());
    setBaselineFilters({});
    prevActiveRef.current = {};
    queryRef.current = "";
    setOriginalQuery("");
  }, []);

  // What actually filters the pool (Issue 1): ONLY user selections that the
  // backend did not already apply when building the pool. The backend applied
  // both its parser intent and the explicit filters sent with the search
  // (dataset.controller.js merges them into the Mongo query, which matches
  // free text as well as structured fields). Re-applying those same selections
  // client-side with this stricter structured-field engine is what dropped
  // legitimate results to zero — so parser intent is never applied here (it is
  // display-only via `displayFilters`), and identical selections are skipped.
  //
  // FR-7 conflicts: a selection disjoint from the parser's intent on the same
  // dimension is NOT silently applied — the cached pool is shown unfiltered by
  // that group (§11.5) and an explicit "Search again using these filters"
  // banner is surfaced instead.
  //
  // Deliberate edge (documented design tradeoff): a user toggle whose value
  // equals a parser-intent value on a dimension the backend already filtered
  // is still applied locally and can drop free-text-matched records. Facet
  // counts stay honest (G3) and the conflict banner covers the disjoint case,
  // so this matches the intended Search ≠ Filter semantics.
  const { appliedFilters, conflict } = useMemo(() => {
    const applied: ActiveFilters = {};
    for (const dimension of FILTER_DIMENSIONS) {
      const current = activeFilters[dimension];
      if (sameSelection(current, baselineFilters[dimension])) continue; // backend already applied it
      if (current?.length) applied[dimension] = [...current];
    }
    let foundConflict: ConflictState = null;
    if (parsedIntent) {
      for (const dimension of Object.keys(applied) as FilterDimension[]) {
        const selected = applied[dimension];
        const intentValues = parsedIntent[dimension];
        if (
          selected?.length &&
          intentValues?.length &&
          !valuesOverlap(dimension, selected, intentValues)
        ) {
          delete applied[dimension];
          foundConflict = { dimension, values: selected };
        }
      }
    }
    return { appliedFilters: applied, conflict: foundConflict };
  }, [activeFilters, baselineFilters, parsedIntent]);

  // Parser pre-selection (FR-8) for the facet checkboxes — display ONLY. The
  // pool is already filtered by the parser, so these values must never filter
  // again; they only pre-tick checkboxes. `overrides` (Issue 3) suppresses the
  // parser's value on any dimension the user touched, so the user's choice
  // always wins until a new search re-applies parser intent.
  const displayFilters = useMemo(
    () => mergeFilters(activeFilters, parsedIntent, overrides),
    [activeFilters, parsedIntent, overrides],
  );

  /** Record a user interaction on `dimension` so parser pre-selection stops applying to it (Issue 3). */
  const markFilterOverride = useCallback((dimension: FilterDimension) => {
    setOverrides((o) => {
      if (o.has(dimension)) return o;
      const next = new Set(o);
      next.add(dimension);
      return next;
    });
  }, []);

  const filteredResults = useMemo(
    () => applyFilters(pool, appliedFilters).map((r) => mapDataset(r, resultSource)),
    [pool, appliedFilters, resultSource],
  );

  const facets = useMemo(() => computeFacets(pool, appliedFilters), [pool, appliedFilters]);

  const restrictHint =
    mode === "loaded" && pool.length > 0 && filteredResults.length <= LOW_WATERMARK;

  const value = useMemo<SearchState>(
    () => ({
      mode,
      error,
      originalQuery,
      hasBaseline: mode === "loaded" || mode === "expanding",
      baselineCount: pool.length,
      activeFilters,
      appliedFilters,
      displayFilters,
      parsedIntent,
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
    }),
    [
      mode,
      error,
      originalQuery,
      pool.length,
      activeFilters,
      appliedFilters,
      displayFilters,
      parsedIntent,
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
    ],
  );

  return <SearchStateContext.Provider value={value}>{children}</SearchStateContext.Provider>;
}

export function useSearchState(): SearchState {
  const ctx = useContext(SearchStateContext);
  if (!ctx) throw new Error("useSearchState must be used within <SearchProvider>");
  return ctx;
}
