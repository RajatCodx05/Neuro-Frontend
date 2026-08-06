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
 * Matching semantics mirror the backend `buildMongoQuery` (dataset.service.js):
 * case-insensitive substring matching over the dataset's structured fields,
 * operating on already-retrieved documents instead of MongoDB. On top of that
 * the engine reuses the codebase's existing MODALITY_SYNONYMS modality
 * families (Python connectors/base.py, Node rankingEngine.js) so coarse
 * repository-native values (`mri`) match precise parser terms (`fMRI`) and
 * vice versa — the same semantic matching the ranking engine already uses.
 *
 * NOTE: unlike the backend's Mongo query (which additionally scans
 * title/description free text), this engine deliberately reads structured
 * metadata fields only — the backend's broad matching happens once when the
 * ranked pool is produced, and must not be re-applied with a narrower engine
 * against the same pool (see search-state.tsx baseline filter diffing).
 *
 * Canonical dimension → structured metadata fields ONLY. Free-text content
 * (title, description, abstract, rendered HTML) NEVER generates facet values
 * or filter options — facet values must be canonical metadata so that a facet
 * click filters the exact same value set it was counted from (Issues 2 & 4).
 * `keywords` is a structured metadata array on the dataset document (not free
 * text), so it remains a valid source for task/format/disease.
 *
 *   modality     → modality[]
 *   disease      → disease + keywords[]        (parser may emit `condition`)
 *   species      → species[]
 *   ageGroup     → age_group[] / age_range[]   (parser may emit `age_range`)
 *   task         → keywords[]
 *   format       → keywords[]
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

// All dimensions synchronized through URL params — including `region`, which
// is a first-class filter dimension like modality/species (Issue 5: the
// backend buildMongoQuery already handles `region`, so region checkboxes must
// round-trip through the URL exactly like every other group).
export const URL_DIMENSIONS: FilterDimension[] = [
  "modality",
  "disease",
  "species",
  "ageGroup",
  "task",
  "format",
  "repository",
  "availability",
  "region",
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

/**
 * Issue 4 — string sentinels written by Python's str(None)/str(nan) that must
 * never surface as facet values.
 */
const NONE_LITERALS = new Set(["none", "null", "nan", "n/a", "-"]);

/**
 * Issue 4 — expand a raw STRUCTURED metadata value into individual values.
 *
 * Structured fields are single- or multi-valued by schema (arrays like
 * `modality`/`keywords`, strings like `disease`/`region`), but real records
 * sometimes store them as:
 *   - Python-stringified lists        `"['meg']"` / `"['a', 'b']"`
 *   - semicolon/pipe-joined lists     `"Alzheimer's disease; neuroimaging; …"`
 *   - string sentinels                `"None"`, `"nan"`
 *
 * These must be split/parsed BEFORE facet generation or matching, otherwise a
 * concatenated metadata blob becomes a single (meaningless) facet value. Only
 * structured fields ever pass through here — free-text content
 * (title/description/HTML) is never a source, so no prose is tokenized.
 */
function expandStructuredValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => expandStructuredValue(v));
  if (value === null || value === undefined) return [];
  const s = String(value).trim();
  if (!s) return [];
  if (NONE_LITERALS.has(s.toLowerCase())) return [];
  // Python-stringified list: "['meg']", "['a', 'b']" (only when quoted — a
  // bare "[meg]" is not a Python repr and is left alone).
  const listMatch = s.match(/^\[(.*)\]$/s);
  if (listMatch) {
    const inner = listMatch[1].trim();
    if (inner && (inner.includes("'") || inner.includes('"'))) {
      const parts = inner
        .split(/\s*'\s*,\s*'|\s*"\s*,\s*"/)
        .map((p) => p.replace(/^['"]|['"]$/g, "").trim())
        .filter(Boolean);
      if (parts.length > 0) return parts.flatMap((p) => expandStructuredValue(p));
    }
  }
  // Semicolon / pipe joined multi-values (never commas — a comma can be part
  // of a legitimate single value and prose must not be tokenized).
  if (/[;|]/.test(s)) {
    return s.split(/[;|]/).flatMap((part) => expandStructuredValue(part.trim()));
  }
  return [s];
}

/** Dedupe a value list case-insensitively, keeping first-seen casing. */
function dedupeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = String(raw ?? "").trim();
    const key = v.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Issue 4 — canonical modality label for a raw value (token -> "fmri", "meg", …).
 * Mirrors MODALITY_VOCAB (Neuro-Agents/app/data/vocab.py) so variant labels
 * ("functional mri", "functional magnetic resonance imaging") collapse onto
 * one facet value, exactly like the synonym families already used for matching.
 */
const MODALITY_CANONICAL_TOKENS: Record<string, string> = {
  meg: "meg",
  magnetoencephalography: "meg",
  magnetoencephalogram: "meg",
  eeg: "eeg",
  electroencephalography: "eeg",
  electroencephalogram: "eeg",
  ieeg: "ieeg",
  "intracranial eeg": "ieeg",
  "intracranial electroencephalography": "ieeg",
  ecog: "ecog",
  electrocorticography: "ecog",
  mri: "mri",
  "magnetic resonance imaging": "mri",
  fmri: "fmri",
  "functional mri": "fmri",
  "functional magnetic resonance imaging": "fmri",
  smri: "smri",
  "structural mri": "smri",
  "structural magnetic resonance imaging": "smri",
  "t1-weighted": "smri",
  "t2-weighted": "smri",
  pet: "pet",
  "positron emission tomography": "pet",
  dti: "dti",
  "diffusion tensor imaging": "dti",
  "diffusion-weighted imaging": "dti",
  "diffusion mri": "dti",
  nirs: "nirs",
  "near-infrared spectroscopy": "nirs",
  fnirs: "fnirs",
  "functional near-infrared spectroscopy": "fnirs",
};

/**
 * Issue 4 — canonical disease label for a raw value (token -> "alzheimer",
 * "parkinson", …). Mirrors DISEASE_TERMS (Neuro-Agents/app/data/vocab.py) so
 * "Alzheimer", "Alzheimer's", "Alzheimer's disease" all collapse onto one
 * facet value instead of appearing as three separate facets.
 */
const DISEASE_CANONICAL_TOKENS: Record<string, string> = {
  parkinson: "parkinson",
  "parkinson's": "parkinson",
  parkinsons: "parkinson",
  "parkinson disease": "parkinson",
  "parkinson's disease": "parkinson",
  alzheimer: "alzheimer",
  "alzheimer's": "alzheimer",
  alzheimers: "alzheimer",
  "alzheimer disease": "alzheimer",
  "alzheimer's disease": "alzheimer",
  "mild cognitive impairment": "mild cognitive impairment",
  "cognitive impairment": "mild cognitive impairment",
  dementia: "dementia",
  demented: "dementia",
  "lewy body": "dementia",
  adhd: "adhd",
  "attention deficit hyperactivity disorder": "adhd",
  "attention deficit disorder": "adhd",
  schizophrenia: "schizophrenia",
  schizophrenic: "schizophrenia",
  psychosis: "schizophrenia",
  psychotic: "schizophrenia",
  bipolar: "bipolar",
  "bipolar disorder": "bipolar",
  "manic depression": "bipolar",
  depression: "depression",
  depressive: "depression",
  "major depressive disorder": "depression",
  mdd: "depression",
  anxiety: "anxiety",
  anxious: "anxiety",
  "generalized anxiety": "anxiety",
  autism: "autism",
  autistic: "autism",
  asd: "autism",
  "autism spectrum disorder": "autism",
  epilepsy: "epilepsy",
  epileptic: "epilepsy",
  epileptiform: "epilepsy",
  seizure: "epilepsy",
  seizures: "epilepsy",
  "multiple sclerosis": "multiple sclerosis",
  "amyotrophic lateral sclerosis": "amyotrophic lateral sclerosis",
  huntington: "huntington",
  "huntington's": "huntington",
  huntingtons: "huntington",
  "huntington disease": "huntington",
  stroke: "stroke",
  strokes: "stroke",
  "ischemic stroke": "stroke",
  "cerebrovascular accident": "stroke",
  "traumatic brain injury": "traumatic brain injury",
  "head injury": "traumatic brain injury",
  concussion: "traumatic brain injury",
  migraine: "migraine",
  migraines: "migraine",
  insomnia: "insomnia",
  "sleep disorder": "insomnia",
  "sleep disorders": "insomnia",
  obesity: "obesity",
  obese: "obesity",
  diabetes: "diabetes",
  diabetic: "diabetes",
  "type 2 diabetes": "diabetes",
  "type 1 diabetes": "diabetes",
  covid: "covid",
  "covid-19": "covid",
  "sars-cov-2": "covid",
  coronavirus: "covid",
  tinnitus: "tinnitus",
  "chronic pain": "chronic pain",
  "neuropathic pain": "chronic pain",
  fibromyalgia: "chronic pain",
};

/**
 * Issue 4 — canonicalize a single structured value onto its dimension's
 * canonical label when it matches a vocabulary token; otherwise unchanged.
 */
function canonicalizeDimensionValue(dimension: FilterDimension, value: string): string {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!v) return value;
  if (dimension === "modality") return MODALITY_CANONICAL_TOKENS[v] ?? value;
  if (dimension === "disease") return DISEASE_CANONICAL_TOKENS[v] ?? value;
  return value;
}

/**
 * The dataset's candidate values for a canonical dimension (§8.5 mapping).
 *
 * Structured metadata ONLY (Issue 4): facet/filter options must never be
 * tokenized out of free-text content. `task`/`format` are read exclusively
 * from the structured `keywords` array — title/description (which can be HTML
 * or prose) are no longer sources for facet values (Issue 2).
 */
export function dimensionFieldSources(dataset: RawDataset, dimension: FilterDimension): string[] {
  const sources: string[] = [];
  switch (dimension) {
    case "modality":
      sources.push(...expandStructuredValue(dataset.modality));
      break;
    case "disease":
      sources.push(
        ...expandStructuredValue(dataset.disease),
        ...expandStructuredValue(dataset.keywords),
      );
      break;
    case "species":
      sources.push(...expandStructuredValue(dataset.species));
      break;
    case "ageGroup":
      sources.push(
        ...expandStructuredValue(dataset.age_group),
        ...expandStructuredValue(dataset.age_range),
      );
      break;
    case "task":
    case "format":
      sources.push(...expandStructuredValue(dataset.keywords));
      break;
    case "repository":
      sources.push(
        ...expandStructuredValue(dataset.source),
        ...expandStructuredValue(dataset.repo),
      );
      break;
    case "availability":
      sources.push(
        ...expandStructuredValue(dataset.access_tier),
        ...expandStructuredValue(dataset.access),
      );
      break;
    case "region":
      sources.push(...expandStructuredValue(dataset.region));
      break;
  }
  // Issue 4: normalize structured metadata BEFORE facet generation — split
  // multi-value strings, drop sentinels, collapse vocabulary synonyms onto one
  // canonical label, then dedupe. `dimensionFieldSources` feeds BOTH facet
  // counting and `matchesFilter`, so facets and filtered lists stay consistent.
  return dedupeValues(sources.map((s) => canonicalizeDimensionValue(dimension, s)));
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

/**
 * True when at least one dataset source value in `declaredValues` matches the
 * requested filter value for `dimension`. Single source of truth for the
 * per-value matching predicate — `matchesFilter` and the facet counter both
 * delegate here, so counts and filtered lists can never diverge.
 */
function anyValueMatches(
  dimension: FilterDimension,
  requested: string,
  declaredValues: string[],
): boolean {
  return declaredValues.some((declared) => valuePairMatches(dimension, requested, declared));
}

/** True when a dataset matches one filter value on one dimension. */
export function matchesFilter(
  dataset: RawDataset,
  dimension: FilterDimension,
  value: string,
): boolean {
  return anyValueMatches(dimension, value, dimensionFieldSources(dataset, dimension));
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
 *
 * Performance (optimized 2026-08-06): the pool is traversed a constant number
 * of times per dimension instead of once per candidate value. Per dimension we
 * (1) precompute every dataset's dimension source values and whether it
 * satisfies every OTHER selected group in a single pass, then (2) count the
 * candidates against only the eligible datasets using the same `anyValueMatches`
 * predicate. This removes the previous repeated `pool.filter(...)` per
 * candidate, which re-ran `dimensionFieldSources` and the other-group checks
 * for every (candidate × dataset) pair — the old worst case was O(N²) pool
 * scans. Results are identical to the previous implementation.
 */
export function computeFacets(pool: RawDataset[], filters: ActiveFilters): FacetMap {
  // Precompute each dataset's source values for every dimension ONCE — the old
  // version recomputed them inside every (candidate × dataset) predicate.
  // Shape: [datasetIndex][dimensionIndex] -> source value list.
  const datasetValues: string[][][] = pool.map((dataset) =>
    FILTER_DIMENSIONS.map((dimension) => dimensionFieldSources(dataset, dimension)),
  );

  const facets: FacetMap = {};
  for (let di = 0; di < FILTER_DIMENSIONS.length; di++) {
    const dimension = FILTER_DIMENSIONS[di];

    // Pass 1 — distinct candidate values (first-seen casing, unchanged) and,
    // per dataset, whether it satisfies every OTHER selected group.
    const candidates = new Map<string, string>();
    const eligible = new Array<boolean>(pool.length).fill(false);
    for (let i = 0; i < pool.length; i++) {
      eligible[i] = matchesAllOtherGroups(pool[i], filters, dimension);
      const values = datasetValues[i][di];
      for (const value of values) {
        const key = String(value).trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, String(value).trim());
      }
    }
    if (candidates.size === 0) continue;
    // Display labels (first-seen casing, preserved exactly like before).
    const labels = [...candidates.values()];

    // Pass 2 — count each candidate over eligible datasets only, using the
    // identical per-value predicate (`anyValueMatches` == `matchesFilter`'s
    // inner matching). A dataset contributes at most once per candidate.
    const counts = new Map<string, number>();
    for (let i = 0; i < pool.length; i++) {
      if (!eligible[i]) continue;
      const values = datasetValues[i][di];
      if (values.length === 0) continue;
      for (const label of labels) {
        if (anyValueMatches(dimension, label, values)) {
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      }
    }

    const list: FacetValue[] = [];
    for (const label of labels) {
      // counts only ever stores positive values (labels with zero matches are absent).
      const count = counts.get(label);
      if (count !== undefined) list.push({ value: label, count });
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
    if (values.length === 0) continue;
    // Issue 4: canonicalize parser-intent values the same way facets are
    // canonicalized, so FR-8 pre-selected checkboxes use the exact same label
    // as the facet row they tick (no "Alzheimer's disease" next to "Alzheimer").
    out[dimension] = values.map((v) => canonicalizeDimensionValue(dimension, v));
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

/**
 * Issue 1 — canonical professional display label for a modality value
 * (DISPLAY ONLY: never used for matching, never stored). Mirrors
 * MODALITY_VOCAB so "mri" → "MRI", "fmri" → "fMRI", "functional magnetic
 * resonance imaging" → "MRI", etc. Unknown values keep title-case.
 */
export function modalityDisplayLabel(value: string): string {
  const v = String(value ?? "").trim();
  if (!v) return v;
  // mapDataset joins modality arrays with ", " — display each token.
  if (v.includes(",")) {
    return v
      .split(",")
      .map((part) => modalityDisplayLabel(part))
      .join(", ");
  }
  const canonical = MODALITY_CANONICAL_TOKENS[v.toLowerCase()];
  if (!canonical) return facetDisplayLabel(v);
  const display: Record<string, string> = {
    meg: "MEG",
    eeg: "EEG",
    ieeg: "iEEG",
    ecog: "ECoG",
    mri: "MRI",
    fmri: "fMRI",
    smri: "sMRI",
    pet: "PET",
    dti: "DTI",
    nirs: "NIRS",
    fnirs: "fNIRS",
  };
  return display[canonical] ?? facetDisplayLabel(v);
}
