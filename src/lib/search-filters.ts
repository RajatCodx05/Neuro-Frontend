/**
 * search-filters.ts — the SINGLE filtering engine (v0.3 §8.5 / FR-3 / G9).
 *
 * Search ≠ Filter. The AI pipeline runs once per query and produces an
 * immutable ranked baseline pool of raw dataset records. Every filter
 * interaction (checkbox toggle, facet click, clear) is a pure, synchronous
 * client-side operation over that pool. There is exactly ONE matching
 * implementation in the frontend: the functions below. The same predicate
 * (`matchesFilter`) drives both filtered result lists and dynamic facet
 * counts, so "EEG (18)" always means exactly 18 datasets (G3 by construction).
 *
 * Semantics mirror the backend `buildMongoQuery` (dataset.service.js):
 * case-insensitive substring matching over the dataset's structured fields,
 * operating on already-retrieved documents instead of MongoDB. On top of that
 * the engine reuses the codebase's existing MODALITY_SYNONYMS modality
 * families (Python connectors/base.py, Node rankingEngine.js) so coarse
 * repository-native values (`mri`) match precise parser terms (`fMRI`) and
 * vice versa — the same semantic matching the ranking engine already uses.
 *
 * Canonical dimension → dataset fields (§8.5 table):
 *   modality     → modality[]
 *   disease      → disease + keywords[]        (parser may emit `condition`)
 *   species      → species[]
 *   ageGroup     → age_group[] / age_range[]   (parser may emit `age_range`)
 *   task         → keywords[] + title + description
 *   format       → keywords[] + title + description
 *   repository   → source
 *   availability → access_tier
 *   region       → region
 */

export const FILTER_DIMENSIONS = [
  "modality",
  "disease",
  "species",
  "ageGroup",
  "task",
  "format",
  "repository",
  "availability",
  "region",
] as const;

export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

/** User/parser selection per canonical dimension: value arrays (OR within a group). */
export type ActiveFilters = Partial<Record<FilterDimension, string[]>>;

/** Raw dataset document shape as returned by the backend (mirrors dataset.model.js). */
export type RawDataset = Record<string, unknown>;

export type FacetValue = { value: string; count: number };
export type FacetMap = Partial<Record<FilterDimension, FacetValue[]>>;

// §8.7 page size and §FR-6 low watermark (filtered pool ≤ LOW_WATERMARK triggers
// the "Search the entire database" action).
export const PAGE_SIZE = 10;
export const LOW_WATERMARK = 3;

export const FILTER_DIMENSION_LABELS: Record<FilterDimension, string> = {
  modality: "Modality",
  disease: "Disease / Condition",
  species: "Species",
  ageGroup: "Age Group",
  task: "Experimental Task",
  format: "Data Format",
  repository: "Repository",
  availability: "Availability",
  region: "Region",
};

// The 8 dimensions synchronized through URL params (region is a derived-only
// facet; see search.tsx validateSearch).
export const URL_DIMENSIONS: FilterDimension[] = [
  "modality",
  "disease",
  "species",
  "ageGroup",
  "task",
  "format",
  "repository",
  "availability",
];

/** Parser/UI key → canonical dimension (FR-5). `keywords`/`raw_query` are ignored. */
const DIMENSION_ALIASES: Record<string, FilterDimension> = {
  modality: "modality",
  disease: "disease",
  condition: "disease",
  species: "species",
  ageGroup: "ageGroup",
  age_group: "ageGroup",
  age_range: "ageGroup",
  task: "task",
  format: "format",
  repository: "repository",
  availability: "availability",
  access_tier: "availability",
  region: "region",
};

/**
 * Modality synonym families — mirrored from rankingEngine.js /
 * Neuro-Agents connectors/base.py (stabilization Phase 2/6).
 */
const MODALITY_SYNONYMS: Record<string, Set<string>> = {
  fmri: new Set(["fmri", "mri", "functional mri", "functional magnetic resonance imaging"]),
  smri: new Set(["smri", "mri", "structural mri", "structural magnetic resonance imaging"]),
  mri: new Set(["mri", "fmri", "smri", "functional mri", "structural mri"]),
  eeg: new Set(["eeg", "electroencephalography"]),
  meg: new Set(["meg", "magnetoencephalography"]),
  ieeg: new Set(["ieeg", "intracranial eeg", "ecog"]),
  ecog: new Set(["ecog", "ieeg", "intracranial eeg"]),
  pet: new Set(["pet", "positron emission tomography"]),
  dti: new Set(["dti", "diffusion mri", "diffusion tensor imaging", "mri"]),
  nirs: new Set(["nirs", "fnirs", "functional near-infrared spectroscopy"]),
  fnirs: new Set(["fnirs", "nirs"]),
};

function modalityOverlap(requested: string, declared: string): boolean {
  const r = String(requested || "")
    .trim()
    .toLowerCase();
  const d = String(declared || "")
    .trim()
    .toLowerCase();
  if (!r || !d) return false;
  if (r === d) return true;
  const famR = MODALITY_SYNONYMS[r];
  const famD = MODALITY_SYNONYMS[d];
  if (famR && famD) return [...famR].some((v) => famD.has(v));
  if (famR) return famR.has(d);
  if (famD) return famD.has(r);
  return r.includes(d) || d.includes(r);
}

/** Normalize a value to a punctuation/hyphen-insensitive token ("resting-state" ↔ "resting state"). */
function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Coerce a scalar/array value to a non-empty string list. */
export function listOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v ?? "")).filter((s) => s !== "");
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

/** The dataset's candidate values for a canonical dimension (§8.5 mapping). */
export function dimensionFieldSources(dataset: RawDataset, dimension: FilterDimension): string[] {
  const sources: string[] = [];
  switch (dimension) {
    case "modality":
      sources.push(...listOf(dataset.modality));
      break;
    case "disease":
      sources.push(...listOf(dataset.disease), ...listOf(dataset.keywords));
      break;
    case "species":
      sources.push(...listOf(dataset.species));
      break;
    case "ageGroup":
      sources.push(...listOf(dataset.age_group), ...listOf(dataset.age_range));
      break;
    case "task":
    case "format":
      sources.push(
        ...listOf(dataset.keywords),
        ...listOf(dataset.title),
        ...listOf(dataset.description),
      );
      break;
    case "repository":
      sources.push(...listOf(dataset.source), ...listOf(dataset.repo));
      break;
    case "availability":
      sources.push(...listOf(dataset.access_tier), ...listOf(dataset.access));
      break;
    case "region":
      sources.push(...listOf(dataset.region));
      break;
  }
  return sources.filter((s) => s !== "");
}

/**
 * Does filter value `requested` match a pool value `declared` for a dimension?
 * Case-insensitive substring (mirror of buildMongoQuery's unanchored regex),
 * bidirectional containment, punctuation-insensitive token equality, plus the
 * modality synonym families. Shared by `matchesFilter`, `computeFacets`, and
 * conflict detection so every count is computed by the identical predicate.
 */
export function valuePairMatches(
  dimension: FilterDimension,
  requested: string,
  declared: string,
): boolean {
  const r = String(requested || "")
    .trim()
    .toLowerCase();
  const d = String(declared || "")
    .trim()
    .toLowerCase();
  if (!r || !d) return false;
  if (r === d) return true;
  if (d.includes(r) || r.includes(d)) return true;
  if (normalizeKey(r) === normalizeKey(d)) return true;
  if (dimension === "modality" && modalityOverlap(r, d)) return true;
  return false;
}

/** True when a dataset matches one filter value on one dimension. */
export function matchesFilter(
  dataset: RawDataset,
  dimension: FilterDimension,
  value: string,
): boolean {
  return dimensionFieldSources(dataset, dimension).some((s) =>
    valuePairMatches(dimension, value, s),
  );
}

/** AND across selected groups, OR within a group. Pure; returns a new array. */
export function applyFilters(pool: RawDataset[], filters: ActiveFilters): RawDataset[] {
  const entries = Object.entries(filters).filter(
    (entry): entry is [FilterDimension, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );
  if (entries.length === 0) return [...pool];
  return pool.filter((dataset) =>
    entries.every(([dimension, values]) =>
      values.some((value) => matchesFilter(dataset, dimension, value)),
    ),
  );
}

/** Dataset matches every selected group EXCEPT `ignore` (used for facet counts). */
export function matchesAllOtherGroups(
  dataset: RawDataset,
  filters: ActiveFilters,
  ignore: FilterDimension,
): boolean {
  for (const [dimension, values] of Object.entries(filters)) {
    if (dimension === ignore) continue;
    if (
      Array.isArray(values) &&
      values.length > 0 &&
      !values.some((v) => matchesFilter(dataset, dimension as FilterDimension, v))
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Dynamic facets (§8.5/§8.6): for each dimension, distinct values present in
 * the pool with counts. Count rule (FR-3/G3): a value's count = number of
 * datasets in the pool for which `matchesFilter(dataset, G, v)` AND all other
 * groups' selections hold — the EXACT predicate applied when `v` is selected,
 * so the count invariant holds by construction even for values that overlap
 * via substring/synonym matching ("MRI" vs "fMRI" each count the same
 * matching datasets). Only values with count > 0 are returned (G4 — zero-count
 * options never render).
 */
export function computeFacets(pool: RawDataset[], filters: ActiveFilters): FacetMap {
  const facets: FacetMap = {};
  for (const dimension of FILTER_DIMENSIONS) {
    // Distinct candidate values present in the pool (case-insensitive dedupe,
    // first-seen casing preserved for display).
    const candidates = new Map<string, string>();
    for (const dataset of pool) {
      for (const value of dimensionFieldSources(dataset, dimension)) {
        const key = String(value).trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, String(value).trim());
      }
    }
    const list: FacetValue[] = [];
    for (const [, label] of candidates) {
      const count = pool.filter(
        (d) => matchesAllOtherGroups(d, filters, dimension) && matchesFilter(d, dimension, label),
      ).length;
      if (count > 0) list.push({ value: label, count });
    }
    list.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    if (list.length > 0) facets[dimension] = list;
  }
  return facets;
}

/** Map parser/UI filter keys (`condition`, `age_range`, `access_tier`, …) onto canonical dimensions (FR-5). */
export function normalizeDimensions(
  raw: Record<string, unknown> | null | undefined,
): ActiveFilters {
  const out: ActiveFilters = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    const dimension = DIMENSION_ALIASES[key];
    if (!dimension) continue; // keywords / raw_query intentionally not facet dimensions
    const values = listOf(value);
    if (values.length > 0) out[dimension] = values;
  }
  return out;
}

export function hasAnySelection(filters: ActiveFilters | null | undefined): boolean {
  return Object.values(filters ?? {}).some((v) => Array.isArray(v) && v.length > 0);
}

/**
 * Merge user (URL) selection with parser intent (FR-8 pre-selection).
 *
 * `overridden` tracks dimensions the user explicitly interacted with since the
 * baseline was loaded: for those, ONLY the user's selection applies (even if
 * empty — this is how a pre-selected parser value can be unticked). For all
 * other dimensions the user's values win, and the parser's values fill gaps.
 */
export function mergeFilters(
  user: ActiveFilters | null | undefined,
  intent: ActiveFilters | null | undefined,
  overridden: ReadonlySet<FilterDimension> = new Set(),
): ActiveFilters {
  const merged: ActiveFilters = {};
  for (const dimension of FILTER_DIMENSIONS) {
    const userValues = user?.[dimension];
    if (overridden.has(dimension)) {
      if (userValues?.length) merged[dimension] = [...userValues];
      continue;
    }
    if (userValues?.length) merged[dimension] = [...userValues];
    else if (intent?.[dimension]?.length) merged[dimension] = [...intent[dimension]];
  }
  return merged;
}

/** Conservative conflict check (R4): same dimension, selections entirely disjoint from parser intent. */
export function valuesOverlap(
  dimension: FilterDimension,
  a: string[] | undefined,
  b: string[] | undefined,
): boolean {
  if (!a?.length || !b?.length) return false;
  return a.some((x) => b.some((y) => valuePairMatches(dimension, x, y)));
}

/** Read the comma-joined URL filter params (search.tsx validateSearch shape). */
export function parseUrlFilters(search: Record<string, unknown>): ActiveFilters {
  const out: ActiveFilters = {};
  for (const dimension of URL_DIMENSIONS) {
    const raw = search[dimension];
    const values =
      typeof raw === "string"
        ? raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    if (values.length > 0) out[dimension] = values;
  }
  return out;
}

/** Stable string identity for a filter selection (used for baseline identity / page resets). */
export function serializeFiltersKey(filters: ActiveFilters | null | undefined): string {
  if (!filters) return "";
  return FILTER_DIMENSIONS.map(
    (dimension) => `${dimension}=${(filters[dimension] ?? []).slice().sort().join("|")}`,
  ).join("&");
}

/** Display label for a raw facet value ("openneuro" → "Openneuro"). Matching always uses the raw value. */
export function facetDisplayLabel(value: string): string {
  const v = String(value || "").trim();
  if (!v) return v;
  return v.charAt(0).toUpperCase() + v.slice(1);
}
