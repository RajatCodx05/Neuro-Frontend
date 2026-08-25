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
 *   repository   → source
 *   modality     → modality[]
 *   disease      → disease + keywords[]        (parser may emit `condition`)
 *   species      → species[]
 *   ageGroup     → age_group[] / age_range[]   (parser may emit `age_range`)
 *   year         → published_at / publication_year / date_published
 *                 (parsed to a 4-digit year; ABSENT records contribute nothing —
 *                  the group auto-hides when no publication date survives)
 *   participants → subject_count bucketed (1–25 / 26–50 / 51–100 / 101–250 / 251+)
 *   size         → size_bytes / size_label bucketed (<10 / 10–100 / 100–500 / 500+ GB)
 *   license      → license
 *   type         → dataset_type / data_type (not populated by current metadata →
 *                 the group auto-hides)
 *   task         → keywords[]  (rendered as the single "Advanced Keywords" group;
 *                 `format` is byte-identical and kept for URL backward compat)
 *   availability → access_tier
 *   region       → region
 */

// FIXED filter categories + dynamic values (v0.4 filter redesign): the group
// list and its order NEVER change; only the values/counts change per result
// set. Advanced Keywords (`task`, sourced from the structured `keywords`
// array — `format` reads the identical array and is kept only so pre-existing
// `format=` URLs keep filtering) is collapsed by default in the UI.
export const FILTER_DIMENSIONS = [
  "ageGroup", // Age Group
  "availability", // Availability
  "size", // Dataset Size
  "type", // Dataset Type
  "disease", // Disease / Condition
  "license", // License
  "modality", // Modality
  "participants", // Participants
  "year", // Publication Year
  "region", // Region
  "repository", // Repository
  "species", // Species
  "task", // rendered as "Advanced Keywords" (exception: positioned at the end of filter dimensions)
  "format", // Data Format (hidden from sidebar; URL backward compatibility)
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

/**
 * Facet dimensions derived from record METADATA (buckets, parsed years,
 * license strings, dataset types) that the backend search contract does not
 * recognize (buildMongoQuery reads modality/species/disease/task/format/
 * repository/age_group/region/access_tier only). They are pure client-side
 * filters over the cached pool: the search payload strips them (so the
 * baseline-exclusion in search-state can never drop them — they always apply
 * locally, even when present in the URL at initial load).
 */
export const CLIENT_ONLY_FILTER_DIMENSIONS = new Set<FilterDimension>([
  "year",
  "participants",
  "size",
  "license",
  "type",
]);

/**
 * Dimensions whose facet values are canonical (bucket labels, parsed years,
 * license strings, dataset types): the value IS the record's value, so
 * matching is exact (case/punctuation-insensitive) — substring semantics
 * would over-count (e.g. "1–25" is a substring of "101–250").
 */
const EXACT_MATCH_DIMENSIONS = new Set<FilterDimension>([
  "year",
  "participants",
  "size",
  "license",
  "type",
]);

export const FILTER_DIMENSION_LABELS: Record<FilterDimension, string> = {
  repository: "Repository",
  modality: "Modality",
  disease: "Disease / Condition",
  species: "Species",
  ageGroup: "Age Group",
  year: "Publication Year",
  participants: "Participants",
  size: "Dataset Size",
  license: "License",
  type: "Dataset Type",
  task: "Advanced Keywords", // `task` renders as the Advanced Keywords group
  availability: "Availability",
  region: "Region",
  format: "Data Format",
};

// All dimensions synchronized through URL params — including `region`, which
// is a first-class filter dimension like modality/species (Issue 5: the
// backend buildMongoQuery already handles `region`, so region checkboxes must
// round-trip through the URL exactly like every other group).
export const URL_DIMENSIONS: FilterDimension[] = [
  "repository",
  "modality",
  "disease",
  "species",
  "ageGroup",
  "year",
  "participants",
  "size",
  "license",
  "type",
  "task",
  "availability",
  "region",
  "format",
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
  year: "year",
  publication_year: "year",
  participants: "participants",
  subject_count: "participants",
  size: "size",
  dataset_size: "size",
  license: "license",
  type: "type",
  dataset_type: "type",
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

// ────────────────────────────────────────────────────────────────────────────
// Fixed-group bucket helpers (v0.4). Values are DERIVED FROM THE CURRENT
// POOL ONLY — a record contributes a bucket only when its metadata exists
// (no fabricated options, no zero-count groups; missing metadata hides the
// group entirely).
// ────────────────────────────────────────────────────────────────────────────

/** Coerce a subject count (number or numeric string) to a number or null. */
function toCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).trim().replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export const MASTER_PARTICIPANTS_KEY_VALUES: string[] = [
  "1–25",
  "26–50",
  "50–100",
  "100+",
];

/** Participants bucket for a subject count (null when the count is absent/invalid). */
export function participantsBucket(count: number): string | null {
  if (count === null || count < 1) return null;
  if (count <= 25) return "1–25";
  if (count < 50) return "26–50";
  if (count <= 100) return "50–100";
  return "100+";
}

const SIZE_UNIT_MULTIPLIER: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
  pb: 1024 ** 5,
  bytes: 1,
  kbytes: 1024,
  mbytes: 1024 ** 2,
  gbytes: 1024 ** 3,
  tbytes: 1024 ** 4,
};

/** Parse a size (byte count or human label like "184 GB") → bytes, or null. */
function parseSizeBytes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || NONE_LITERALS.has(s.toLowerCase())) return null;
  const m = s
    .toLowerCase()
    .match(/(\d+(?:\.\d+)?)\s*([kmgtp]?b|bytes|kbytes|mbytes|gbytes|tbytes)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n * (SIZE_UNIT_MULTIPLIER[m[2]] ?? 1) : null;
}

export const MASTER_SIZE_KEY_VALUES: string[] = [
  "<10 GB",
  "10–100 GB",
  "100–500 GB",
  "500 GB+",
];

/** Dataset size bucket label for a byte count. */
export function sizeBucketLabel(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb < 10) return "<10 GB";
  if (gb <= 100) return "10–100 GB";
  if (gb <= 500) return "100–500 GB";
  return "500 GB+";
}

/** 4-digit year parsed from a publication-date string (null when absent). */
function yearOf(value: string): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const m = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1900 && y <= 2100 ? m[1] : null;
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
 * Issue 4 — canonical age-group label for a raw value. Mirrors AGE_TERMS
 * (Neuro-Agents/app/data/vocab.py) — the controlled vocabulary the ingestion
 * pipeline already writes into dataset age_group metadata — so query-intent
 * values ("pediatric", legacy parser output) and facet values ("Child") both
 * collapse onto ONE concept and never falsely conflict (FR-7).
 */
const AGE_GROUP_CANONICAL_TOKENS: Record<string, string> = {
  infant: "infant",
  infants: "infant",
  newborn: "infant",
  newborns: "infant",
  neonatal: "infant",
  neonates: "infant",
  child: "child",
  children: "child",
  kid: "child",
  kids: "child",
  pediatric: "child",
  pediatrics: "child",
  paediatric: "child",
  "school-age": "child",
  adolescent: "adolescent",
  adolescents: "adolescent",
  teen: "adolescent",
  teens: "adolescent",
  teenager: "adolescent",
  teenagers: "adolescent",
  youth: "adolescent",
  adult: "adult",
  adults: "adult",
  elderly: "elderly",
  geriatric: "elderly",
  "older adult": "elderly",
  "older adults": "elderly",
};

/** Do two raw age-group values denote the same canonical concept? */
function ageGroupOverlap(requested: string, declared: string): boolean {
  const r = String(requested || "")
    .trim()
    .toLowerCase();
  const d = String(declared || "")
    .trim()
    .toLowerCase();
  if (!r || !d) return false;
  const cr = AGE_GROUP_CANONICAL_TOKENS[r] ?? r;
  const cd = AGE_GROUP_CANONICAL_TOKENS[d] ?? d;
  if (cr === cd) return true;
  // Canonical labels are never substrings of one another; containment only
  // guards against uncanonicalized variants sharing a prefix.
  return cr.includes(cd) || cd.includes(cr);
}

export const MASTER_DISEASE_KEY_VALUES: string[] = [
  "ADHD",
  "Alzheimer's",
  "Amyotrophic lateral sclerosis",
  "Anxiety",
  "Autism",
  "Bipolar",
  "Chronic pain",
  "COVID-19",
  "Dementia",
  "Depression",
  "Diabetes",
  "Epilepsy",
  "Healthy",
  "Huntington's",
  "Insomnia",
  "Migraine",
  "Mild cognitive impairment",
  "Multiple sclerosis",
  "Obesity",
  "Parkinson's",
  "Schizophrenia",
  "Stroke",
  "Tinnitus",
  "Traumatic brain injury",
];

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
  if (dimension === "ageGroup") return AGE_GROUP_CANONICAL_TOKENS[v] ?? value;
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
    case "disease": {
      // Disease / Condition (v0.4): shows VOCABULARY-MEMBER conditions only.
      // The enriched `disease` field is already canonical; keywords qualify
      // only when they map onto a known disease term. Incidental keywords
      // ("ICA", "COBRE", "resting state", …) never surface as diseases — they
      // belong to the Advanced Keywords group, which reads the same array.
      for (const v of expandStructuredValue(dataset.disease)) {
        const lower = String(v).trim().toLowerCase().replace(/'/g, "'");
        sources.push(DISEASE_CANONICAL_TOKENS[lower] ?? String(v).trim());
      }
      for (const v of expandStructuredValue(dataset.keywords)) {
        const lower = String(v).trim().toLowerCase().replace(/'/g, "'");
        const canonical = DISEASE_CANONICAL_TOKENS[lower];
        if (canonical) sources.push(canonical);
      }
      break;
    }
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
    case "format": {
      // Advanced Keywords normalization (v0.4, facet layer only): structured
      // `keywords` entries are sometimes comma-joined blobs ("fMRI, resting
      // state, adolescents, pilot"). Splitting them yields single concepts
      // instead of one long facet. Matching is substring-based, so a split
      // fragment selects exactly the datasets containing it — the count/click
      // invariant holds by construction (bidirectional substring also keeps
      // pre-existing blob-shaped `task=` URLs working).
      const raw = expandStructuredValue(dataset.keywords);
      for (const k of raw) {
        for (const part of String(k).split(",")) {
          const p = part.trim();
          if (p) sources.push(p);
        }
      }
      break;
    }
    case "year": {
      // Publication year from a genuine publication-date field only. Records
      // without one contribute nothing (no fabrication, no ingestion-time
      // proxy) — the group auto-hides when the pool has no publication dates.
      const raw = [
        ...expandStructuredValue(dataset.published_at),
        ...expandStructuredValue(dataset.publication_year),
        ...expandStructuredValue(dataset.date_published),
      ];
      for (const v of raw) {
        const y = yearOf(v);
        if (y) sources.push(y);
      }
      break;
    }
    case "participants": {
      const count = toCount(dataset.subject_count);
      if (count !== null) {
        const bucket = participantsBucket(count);
        if (bucket) sources.push(bucket);
      }
      break;
    }
    case "size": {
      const bytes =
        parseSizeBytes(dataset.size_bytes) ?? parseSizeBytes(dataset.size_label);
      if (bytes !== null) sources.push(sizeBucketLabel(bytes));
      break;
    }
    case "license":
      for (const v of expandStructuredValue(dataset.license)) {
        const norm = normalizeLicenseValue(v);
        if (norm) sources.push(norm);
      }
      break;
    case "type":
      // Not populated by the current metadata model → the group auto-hides
      // ("hide unsupported groups automatically"). Ready for future metadata.
      sources.push(
        ...expandStructuredValue(dataset.dataset_type),
        ...expandStructuredValue(dataset.data_type),
      );
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
  if (EXACT_MATCH_DIMENSIONS.has(dimension)) {
    // Canonical values (buckets/years/licenses/types): exact match only —
    // substring would over-count ("1–25" ⊂ "101–250"). Punctuation-insensitive
    // equality keeps en-dash bucket labels ("1–25") matching ASCII-hyphen URL
    // values ("1-25").
    return r === d || normalizeKey(r) === normalizeKey(d);
  }
  if (r === d) return true;
  if (d.includes(r) || r.includes(d)) return true;
  if (normalizeKey(r) === normalizeKey(d)) return true;
  if (dimension === "modality" && modalityOverlap(r, d)) return true;
  if (dimension === "ageGroup" && ageGroupOverlap(r, d)) return true;
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

    if (dimension === "disease") {
      for (const masterVal of MASTER_DISEASE_KEY_VALUES) {
        const key = masterVal.trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, masterVal.trim());
      }
    } else if (dimension === "participants") {
      for (const masterVal of MASTER_PARTICIPANTS_KEY_VALUES) {
        const key = masterVal.trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, masterVal.trim());
      }
    } else if (dimension === "size") {
      for (const masterVal of MASTER_SIZE_KEY_VALUES) {
        const key = masterVal.trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, masterVal.trim());
      }
    }

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
      const count = counts.get(label);
      if (dimension === "disease" || dimension === "participants" || dimension === "size") {
        list.push({ value: label, count: count ?? 0 });
      } else {
        if (count !== undefined) list.push({ value: label, count });
      }
    }
    sortFacetValues(dimension, list);
    if (list.length > 0) facets[dimension] = list;
  }
  return facets;
}

/** Get the user-visible display label for sorting a facet value alphabetically. */
export function getFacetSortLabel(dimension: FilterDimension, value: string): string {
  if (dimension === "modality") return modalityDisplayLabel(value);
  if (dimension === "license") return licenseDisplayLabel(value);
  if (dimension === "task") return keywordDisplayLabel(value);
  return facetDisplayLabel(value);
}

/** Sort facet values alphabetically by their user-visible display label (preserving numeric rank for buckets/years). */
export function sortFacetValues(dimension: FilterDimension, list: FacetValue[]): FacetValue[] {
  return list.sort((a, b) => {
    const ra = facetNaturalRank(dimension, a.value);
    const rb = facetNaturalRank(dimension, b.value);
    if (Number.isFinite(ra) && Number.isFinite(rb) && ra !== rb) return ra - rb;
    const labelA = getFacetSortLabel(dimension, a.value);
    const labelB = getFacetSortLabel(dimension, b.value);
    return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: "base" });
  });
}

/** Natural sort rank for fixed-order facet groups (NaN = not a ranked group). */
export function facetNaturalRank(dimension: FilterDimension, value: string): number {
  if (dimension === "participants" || dimension === "size") {
    const isLessThan = String(value).startsWith("<");
    const m = String(value).match(/(\d+(?:\.\d+)?)/);
    if (!m) return Number.MAX_SAFE_INTEGER;
    const num = parseFloat(m[1]);
    return isLessThan ? num - 0.5 : num;
  }
  if (dimension === "year") {
    const y = parseInt(String(value), 10);
    return Number.isFinite(y) ? y : Number.MAX_SAFE_INTEGER;
  }
  return Number.NaN;
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
 * Display label for Advanced Keywords (DISPLAY ONLY): keywords keep their
 * original casing ("fMRI", "resting state", "ADHD") — first-letter
 * capitalization would mangle acronyms ("fMRI" → "FMRI").
 */
export function keywordDisplayLabel(value: string): string {
  return String(value ?? "").trim();
}

/**
 * License normalization (v0.4, facet layer only — the VALUE both facets and
 * matching use, so the count/click invariant holds). Common SPDX-ish forms
 * get professional casing ("cc-by-4.0" → "CC-BY-4.0", "cc-zero"/"cc0" →
 * "CC0", "mit" → "MIT", "pddl" → "PDDL", sentinels → "Unknown"); long
 * license PARAGRAPHS are compacted to their first sentence (≤ 64 chars) so a
 * giant text blob never floods the sidebar. Unknown forms keep their exact
 * recorded string — values are never fabricated.
 */
export function normalizeLicenseValue(value: string): string {
  const v = String(value ?? "").trim();
  if (!v) return v;
  // Facet values round-trip through the URL as comma-joined lists
  // (parseUrlFilters splits on ","), so a comma inside a license value would
  // fragment on reload/share — commas are replaced with spaces.
  const clean = (s: string) => s.replace(/,/g, " ");
  const lower = v.toLowerCase();
  if (["unknown", "none", "n/a", "-", "nan", "null"].includes(lower)) return "Unknown";
  if (["cc0", "cc-0", "cc 0", "cc-zero"].includes(lower)) return "CC0";
  if (lower === "mit") return "MIT";
  if (lower === "pddl") return "PDDL";
  const cc = lower.match(/^cc[- ](by[-a-z0-9.]*)$/);
  if (cc) return `CC-${cc[1].toUpperCase()}`;
  if (v.length <= 64) return clean(v);
  const firstSentence = v.split(/(?<=[.!?])\s+|\n/)[0].trim();
  if (firstSentence && firstSentence.length <= 64) return clean(firstSentence);
  return clean(firstSentence ? `${firstSentence.slice(0, 61).trimEnd()}…` : v.slice(0, 64));
}

/** Display label for a license facet value (delegates to the shared normalizer). */
export function licenseDisplayLabel(value: string): string {
  return normalizeLicenseValue(value);
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
