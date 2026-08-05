/**
 * search-state.tsx — search state layer (v0.3 §8.2/§8.3).
 *
 * Owns the immutable ranked baseline ("Search ≠ Filter"):
 *   - `pool`          raw ranked results from the last pipeline run (immutable
 *                     for the lifetime of a baseline; replaced ONLY by a new
 *                     pipeline run — initial search or "Search entire database")
 *   - `parsedIntent`  parser-derived dimensions from the last response (FR-8/FR-7)
 *   - `activeFilters` user selection, synchronized from the URL by the route
 *   - `appliedFilters` activeFilters + parser pre-selection, minus any
 *                     conflicting selection (derived — what actually filters)
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
  appliedFilters: ActiveFilters;
  parsedIntent: ActiveFilters | null;
  filteredResults: SearchResult[];
  facets: FacetMap;
  conflict: ConflictState;
  restrictHint: boolean;
  runSearch: (query: string, filters: ActiveFilters) => void;
  expandSearch: () => void;
  setActiveFilters: (filters: ActiveFilters) => void;
  clearFilters: () => void;
  reset: () => void;
};

const SearchStateContext = createContext<SearchState | null>(null);

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
    const same = (a: string[] | undefined, b: string[] | undefined) =>
      JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
    if (
      Object.keys(prev).every((k) =>
        same(prev[k as FilterDimension], filters[k as FilterDimension]),
      ) &&
      Object.keys(filters).every((k) =>
        same(prev[k as FilterDimension], filters[k as FilterDimension]),
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
      if (!same(prev[dim], filters[dim])) changed.push(dim);
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
    prevActiveRef.current = {};
    queryRef.current = "";
    setOriginalQuery("");
  }, []);

  // Applied filters = user selection + parser pre-selection (FR-8), with any
  // conflicting selection held back and surfaced as a banner (FR-7, R4).
  const { appliedFilters, conflict } = useMemo(() => {
    const display = mergeFilters(activeFilters, parsedIntent, overrides);
    if (parsedIntent) {
      for (const dimension of Object.keys(activeFilters) as FilterDimension[]) {
        const selected = activeFilters[dimension];
        const intentValues = parsedIntent[dimension];
        if (
          selected?.length &&
          intentValues?.length &&
          !valuesOverlap(dimension, selected, intentValues)
        ) {
          // Disjoint selection → do NOT filter by it; show the explicit
          // "Search again using these filters" action instead (§11.5).
          return {
            appliedFilters: { ...display, [dimension]: intentValues },
            conflict: { dimension, values: selected },
          };
        }
      }
    }
    return { appliedFilters: display, conflict: null };
  }, [activeFilters, parsedIntent, overrides]);

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
      parsedIntent,
      filteredResults,
      facets,
      conflict,
      restrictHint,
      runSearch,
      expandSearch,
      setActiveFilters,
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
      parsedIntent,
      filteredResults,
      facets,
      conflict,
      restrictHint,
      runSearch,
      expandSearch,
      setActiveFilters,
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
