import {
  classifyModality,
  classifyDisease,
  classifySpecies,
  classifyYear,
  classifyParticipants,
  classifySize,
} from "./filter-classifications";

/**
 * search-filters.ts — the SINGLE filtering engine (v0.4 / M1–M7).
 *
 * Search ≠ Filter. The AI pipeline runs once per query and produces an
 * immutable ranked baseline pool of raw dataset records. Every filter
 * interaction (checkbox toggle, facet click, clear) is a pure, synchronous
 * client-side operation over that pool. There is exactly ONE matching
 * implementation in the frontend: the functions below.
 *
 * Partition invariant (M2–M7): SUM(bucket counts for dimension D) === eligible
 * pool size. Each dataset maps to EXACTLY ONE bucket per dimension, enforced
 * by delegating to filter-classifications.ts classifiers that always return a
 * single canonical string. The facet counter uses exclusive single-bucket
 * assignment (not multi-value anyValueMatches) so double-counting is
 * structurally impossible.
 *
 *   repository   → source
 *   modality     → modality[]  (M2: MRI|EEG|IEEG|PET|MEG|fNIRS|Unspecified, IEEG>EEG)
 *   disease      → disease+keywords[]  (M7: 8 canonical|Others|Unspecified)
 *   species      → species[]  (M5: Human|Animal|Unspecified)
 *   ageGroup     → age_group[]/age_range[]
 *   year         → published_at/publication_year/date_published
 *                  (M4: Before 2020|2020–2022|2023–2025|2026+|Unspecified)
 *   participants → subject_count  (M6: 1–25|26–50|51–100|101+|Unspecified)
 *   size         → size_bytes/size_label  (M3: <10 GB|10–100 GB|100–500 GB|500 GB+|Unspecified)
 *   license      → license
 *   task         → keywords[]  ("Advanced Keywords" group)
 *   availability → access_tier
 *   region       → region
 *
 * M1: Dataset Type filter has been removed entirely.
 * M3/M4/M6: size/year/participants now also apply as backend MongoDB predicates.
 */

// FIXED filter categories + dynamic values (v0.4 / M1–M7):
// M1: Dataset Type has been removed. All other groups remain in fixed order.
export const FILTER_DIMENSIONS = [
  "ageGroup",      // Age Group
  "availability",  // Availability
  "size",          // Dataset Size          (M3: backend-connected)
  "disease",       // Disease / Condition   (M7: +Others+Unspecified)
  "license",       // License
  "modality",      // Modality              (M2: 7 buckets)
  "participants",  // Participants          (M6: backend-connected)
  "year",          // Publication Year      (M4: backend-connected, 2026+)
  "repository",    // Repository
  "species",       // Species               (M5: 3 buckets)
  "task",          // Advanced Keywords
  "format",        // Data Format (hidden; URL backward compat)
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
// ponytail: M3/M4/M6 promote size/year/participants to backend-aware.
// They still work client-side over the pool but are no longer stripped
// from the search payload → backend builds Mongo predicates for them.
export const CLIENT_ONLY_FILTER_DIMENSIONS = new Set<FilterDimension>([
  "license",
]);

/**
 * Dimensions whose facet values are canonical (bucket labels, parsed years,
 * license strings, dataset types): the value IS the record's value, so
 * matching is exact (case/punctuation-insensitive) — substring semantics
 * would over-count (e.g. "1–25" is a substring of "101–250").
 */
// ponytail: all bucket dimensions use exact match (substring would over-count).
const EXACT_MATCH_DIMENSIONS = new Set<FilterDimension>([
  "year",
  "participants",
  "size",
  "license",
  "modality",
  "species",
  "disease",
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
  task: "Advanced Keywords",
  availability: "Availability",
  format: "Data Format",
};

// All dimensions synchronized through URL params (M1: type removed)
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
  "task",
  "availability",
  "format",
];

/** Parser/UI key → canonical dimension (FR-5). `keywords`/`raw_query` are ignored. M1: type/dataset_type removed. */
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
  task: "task",
  format: "format",
  repository: "repository",
  availability: "availability",
  access_tier: "availability",
};

// ponytail: MODALITY_SYNONYMS kept for backward compat with any remaining
// non-facet uses (rankingEngine parity). Facet counting no longer uses it —
// classifyModality() in filter-classifications.ts is the authority.
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
  const r = String(requested || "").trim().toLowerCase();
  const d = String(declared || "").trim().toLowerCase();
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

export const MASTER_AGE_GROUP_KEY_VALUES: string[] = [
  "Adolescent",
  "Adult",
  "Child",
  "Pediatric",
  "Senior",
  "Unspecified",
];

/**
 * @deprecated Use classifyParticipants from filter-classifications.ts.
 * Kept only for any callers outside the facet engine.
 */
export function participantsBucket(count: number): string | null {
  if (count === null || count < 1) return null;
  if (count <= 25)  return "1–25";
  if (count <= 50)  return "26–50";
  if (count <= 100) return "51–100";
  return "101+";
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

export const MASTER_AVAILABILITY_KEY_VALUES: string[] = [
  "Open",
  "Registered",
  "Restricted",
  "Unspecified",
];

// M3: Size — 5 static buckets
export const MASTER_SIZE_KEY_VALUES: string[] = [
  "<10 GB",
  "10–100 GB",
  "100–500 GB",
  "500 GB+",
  "Unspecified",
];

// M1: MASTER_TYPE_KEY_VALUES removed.

export const MASTER_LICENSE_KEY_VALUES: string[] = [
  "CC0",
  "CC-BY-4.0",
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA-4.0",
  "CC-BY-SA-4.0",
  "Open Data",
  "PDDL",
  "Unspecified",
];

// M2: 7 canonical modality buckets (MRI subsumes fMRI/sMRI/DTI/diffusion)
export const MASTER_MODALITY_KEY_VALUES: string[] = [
  "MRI",
  "EEG",
  "IEEG",
  "PET",
  "MEG",
  "fNIRS",
  "Unspecified",
];

// M6: non-overlapping participant buckets (51–100 not 50–100; 101+ not 100+)
export const MASTER_PARTICIPANTS_KEY_VALUES: string[] = [
  "1–25",
  "26–50",
  "51–100",
  "101+",
  "Unspecified",
];

// M4: 5 static year buckets, year>=2026 → "2026+"
export const MASTER_YEAR_KEY_VALUES: string[] = [
  "Before 2020",
  "2020–2022",
  "2023–2025",
  "2026+",
  "Unspecified",
];

// M5: 3 species buckets
export const MASTER_SPECIES_KEY_VALUES: string[] = [
  "Human",
  "Animal",
  "Unspecified",
];

// M7: 8 canonical + Others + Unspecified
export const MASTER_DISEASE_KEY_VALUES: string[] = [
  "ADHD",
  "Alzheimer's",
  "Autism",
  "Bipolar",
  "Epilepsy",
  "Healthy",
  "Parkinson's",
  "Schizophrenia",
  "Others",
  "Unspecified",
];

/** Map of static filter dimensions to their pre-seeded master options. Repository excluded (dynamic). M1: type removed. */
export const STATIC_DIMENSIONS_MAP: Record<string, string[]> = {
  ageGroup: MASTER_AGE_GROUP_KEY_VALUES,
  availability: MASTER_AVAILABILITY_KEY_VALUES,
  size: MASTER_SIZE_KEY_VALUES,
  license: MASTER_LICENSE_KEY_VALUES,
  modality: MASTER_MODALITY_KEY_VALUES,
  participants: MASTER_PARTICIPANTS_KEY_VALUES,
  year: MASTER_YEAR_KEY_VALUES,
  species: MASTER_SPECIES_KEY_VALUES,
  disease: MASTER_DISEASE_KEY_VALUES,
};

/** @deprecated Use classifySize from filter-classifications.ts. */
export function sizeBucketLabel(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb < 10)   return "<10 GB";
  if (gb <= 100) return "10–100 GB";
  if (gb <= 500) return "100–500 GB";
  return "500 GB+";
}

// ponytail: yearOf kept for canonicalizeDimensionValue backward compat.
function yearOf(value: string): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const m = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (y < 1900 || y > 2100) return null;
  if (y < 2020)  return "Before 2020";
  if (y <= 2022) return "2020–2022";
  if (y <= 2025) return "2023–2025";
  return "2026+"; // y >= 2026
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
  parkinson: "Parkinson's",
  "parkinson's": "Parkinson's",
  parkinsons: "Parkinson's",
  "parkinson disease": "Parkinson's",
  "parkinson's disease": "Parkinson's",
  alzheimer: "Alzheimer's",
  "alzheimer's": "Alzheimer's",
  alzheimers: "Alzheimer's",
  "alzheimer disease": "Alzheimer's",
  "alzheimer's disease": "Alzheimer's",
  "mild cognitive impairment": "Mild cognitive impairment",
  "cognitive impairment": "Mild cognitive impairment",
  dementia: "Dementia",
  demented: "Dementia",
  "lewy body": "Dementia",
  adhd: "ADHD",
  "attention deficit hyperactivity disorder": "ADHD",
  "attention deficit disorder": "ADHD",
  schizophrenia: "Schizophrenia",
  schizophrenic: "Schizophrenia",
  psychosis: "Schizophrenia",
  psychotic: "Schizophrenia",
  bipolar: "Bipolar",
  "bipolar disorder": "Bipolar",
  "manic depression": "Bipolar",
  depression: "Depression",
  depressive: "Depression",
  "major depressive disorder": "Depression",
  mdd: "Depression",
  anxiety: "Anxiety",
  anxious: "Anxiety",
  "generalized anxiety": "Anxiety",
  autism: "Autism",
  autistic: "Autism",
  asd: "Autism",
  "autism spectrum disorder": "Autism",
  epilepsy: "Epilepsy",
  epileptic: "Epilepsy",
  epileptiform: "Epilepsy",
  seizure: "Epilepsy",
  seizures: "Epilepsy",
  "multiple sclerosis": "Multiple sclerosis",
  "amyotrophic lateral sclerosis": "Amyotrophic lateral sclerosis",
  huntington: "Huntington's",
  "huntington's": "Huntington's",
  huntingtons: "Huntington's",
  "huntington disease": "Huntington's",
  stroke: "Stroke",
  strokes: "Stroke",
  "ischemic stroke": "Stroke",
  "cerebrovascular accident": "Stroke",
  "traumatic brain injury": "Traumatic brain injury",
  "head injury": "Traumatic brain injury",
  concussion: "Traumatic brain injury",
  migraine: "Migraine",
  migraines: "Migraine",
  insomnia: "Insomnia",
  "sleep disorder": "Insomnia",
  "sleep disorders": "Insomnia",
  obesity: "Obesity",
  obese: "Obesity",
  diabetes: "Diabetes",
  diabetic: "Diabetes",
  "type 2 diabetes": "Diabetes",
  "type 1 diabetes": "Diabetes",
  covid: "COVID-19",
  "covid-19": "COVID-19",
  "sars-cov-2": "COVID-19",
  coronavirus: "COVID-19",
  tinnitus: "Tinnitus",
  "chronic pain": "Chronic pain",
  "neuropathic pain": "Chronic pain",
  fibromyalgia: "Chronic pain",
  healthy: "Healthy",
  health: "Healthy",
  "healthy control": "Healthy",
  "healthy controls": "Healthy",
  "normal control": "Healthy",
  "normal controls": "Healthy",
  control: "Healthy",
  controls: "Healthy",
};

const AGE_GROUP_CANONICAL_TOKENS: Record<string, string> = {
  pediatric: "Pediatric",
  infant: "Pediatric",
  infants: "Pediatric",
  baby: "Pediatric",
  babies: "Pediatric",
  child: "Child",
  children: "Child",
  kid: "Child",
  kids: "Child",
  adolescent: "Adolescent",
  adolescents: "Adolescent",
  teen: "Adolescent",
  teens: "Adolescent",
  teenager: "Adolescent",
  teenagers: "Adolescent",
  adult: "Adult",
  adults: "Adult",
  senior: "Senior",
  seniors: "Senior",
  elderly: "Senior",
  aging: "Senior",
  aged: "Senior",
};

/**
 * Issue 4 — canonicalize a single structured value onto its dimension's
 * canonical label when it matches a vocabulary token; otherwise unchanged.
 */
export function canonicalizeDimensionValue(dimension: FilterDimension, value: string): string {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!v) return value;
  if (dimension === "modality") return MODALITY_CANONICAL_TOKENS[v] ?? value;
  if (dimension === "disease") {
    const masterMatch = MASTER_DISEASE_KEY_VALUES.find((m) => m.toLowerCase() === v);
    if (masterMatch) return masterMatch;
    return DISEASE_CANONICAL_TOKENS[v] ?? value;
  }
  if (dimension === "ageGroup") {
    const masterMatch = MASTER_AGE_GROUP_KEY_VALUES.find((m) => m.toLowerCase() === v);
    if (masterMatch) return masterMatch;
    return AGE_GROUP_CANONICAL_TOKENS[v] ?? value;
  }
  if (dimension === "availability") {
    if (v === "open" || v === "public") return "Open";
    if (v === "registered" || v === "account" || v === "login") return "Registered";
    if (v === "restricted" || v === "controlled" || v === "on request" || v === "dua" || v === "approval") return "Restricted";
    const masterMatch = MASTER_AVAILABILITY_KEY_VALUES.find((m) => m.toLowerCase() === v);
    if (masterMatch) return masterMatch;
    return "Restricted";
  }
  if (dimension === "year") {
    const b = yearOf(value);
    if (b) return b;
    const masterMatch = MASTER_YEAR_KEY_VALUES.find((m) => m.toLowerCase() === v);
    if (masterMatch) return masterMatch;
    return value;
  }
  return value;
}


/**
 * The dataset's canonical bucket for a dimension (M2–M7 single-bucket rule).
 *
 * For bucket dimensions (modality/disease/species/year/participants/size) this
 * returns exactly [bucket] — one element guaranteed — so the facet counter can
 * use exclusive assignment and SUM(counts) === eligible pool size by construction.
 *
 * For non-bucket dimensions (repository/task/format/ageGroup/availability/license)
 * the original multi-value behavior is preserved: multiple values per dataset
 * are still valid, and the caller is responsible for correct counting semantics.
 */
export function dimensionFieldSources(dataset: RawDataset, dimension: FilterDimension): string[] {
  switch (dimension) {
    case "modality":
      // M2: single canonical bucket via classifier (IEEG > EEG precedence)
      return [classifyModality(dataset.modality)];

    case "disease":
      // M7: single canonical bucket (8 known | Others | Unspecified)
      return [classifyDisease(dataset.disease, dataset.keywords)];

    case "species":
      // M5: single canonical bucket (Human | Animal | Unspecified)
      return [classifySpecies(dataset.species)];

    case "year":
      // M4: single canonical bucket (Before 2020 | 2020–2022 | 2023–2025 | 2026+ | Unspecified)
      return [classifyYear(dataset.published_at, dataset.publication_year, dataset.date_published)];

    case "participants":
      // M6: single canonical bucket (1–25 | 26–50 | 51–100 | 101+ | Unspecified)
      return [classifyParticipants(dataset.subject_count)];

    case "size":
      // M3: single canonical bucket (<10 GB | 10–100 GB | 100–500 GB | 500 GB+ | Unspecified)
      return [classifySize(dataset.size_bytes, dataset.size_label)];

    case "ageGroup": {
      const raw = [
        ...expandStructuredValue(dataset.age_group),
        ...expandStructuredValue(dataset.age_range),
      ];
      const normed: string[] = [];
      for (const v of raw) {
        const norm = canonicalizeDimensionValue("ageGroup", v);
        if (norm) normed.push(norm);
      }
      return dedupeValues(normed);
    }

    case "task":
    case "format": {
      const raw = expandStructuredValue(dataset.keywords);
      const parts: string[] = [];
      for (const k of raw) {
        for (const part of String(k).split(",")) {
          const p = part.trim();
          if (p) parts.push(p);
        }
      }
      return dedupeValues(parts);
    }

    case "license": {
      const normed: string[] = [];
      for (const v of expandStructuredValue(dataset.license)) {
        const norm = normalizeLicenseValue(v);
        if (norm) normed.push(norm);
      }
      return dedupeValues(normed);
    }

    case "repository":
      return dedupeValues([
        ...expandStructuredValue(dataset.source),
        ...expandStructuredValue(dataset.repo),
      ]);

    case "availability": {
      const sources = [
        ...expandStructuredValue(dataset.access_tier),
        ...expandStructuredValue(dataset.access),
      ];
      return dedupeValues(sources.map((s) => canonicalizeDimensionValue("availability", s)));
    }

    default:
      return [];
  }
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
  if (requested.trim().toLowerCase() === "unspecified") {
    return (
      declaredValues.length === 0 ||
      declaredValues.every(
        (v) =>
          NONE_LITERALS.has(String(v).toLowerCase()) ||
          String(v).trim().toLowerCase() === "unspecified",
      )
    );
  }
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
 * Partition-invariant facet counter (M2–M7).
 *
 * For BUCKET dimensions (modality/disease/species/year/participants/size):
 *   dimensionFieldSources returns exactly [oneBucket] per dataset.
 *   Each eligible dataset increments exactly ONE bucket counter.
 *   SUM(all bucket counts) === eligible pool size. No double-counting possible.
 *
 * For NON-BUCKET dimensions (repository/task/format/ageGroup/availability/license):
 *   Multi-value behavior is preserved (a dataset may appear in multiple values).
 *   These dimensions never violate partition invariant by design (not claimed).
 *
 * Reproduces the old 22+8+1=31 bug case: the old code used anyValueMatches
 * (multi-label scan) which let a dataset with disease=["Epilepsy","Alzheimer's"]
 * increment both Epilepsy and Alzheimer's. classifyDisease now picks the
 * FIRST canonical match and returns exactly one bucket, so the sum is correct.
 */
export function computeFacets(pool: RawDataset[], filters: ActiveFilters): FacetMap {
  // Precompute per-dataset bucket values once for all dimensions.
  // For bucket dims this is always a 1-element array.
  const datasetBuckets: string[][][] = pool.map((dataset) =>
    FILTER_DIMENSIONS.map((dimension) => dimensionFieldSources(dataset, dimension)),
  );

  // Identify bucket dimensions — those with static master lists where
  // partition invariant applies. For these, use exclusive single-bucket counting.
  const BUCKET_DIMENSIONS = new Set<FilterDimension>([
    "modality", "disease", "species", "year", "participants", "size",
  ]);

  const facets: FacetMap = {};
  for (let di = 0; di < FILTER_DIMENSIONS.length; di++) {
    const dimension = FILTER_DIMENSIONS[di];
    const isBucketDim = BUCKET_DIMENSIONS.has(dimension);

    // Seed candidates from the master list (static dims always show all buckets).
    const candidates = new Map<string, string>();
    const masterValues = STATIC_DIMENSIONS_MAP[dimension];
    if (masterValues) {
      for (const masterVal of masterValues) {
        const key = masterVal.trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, masterVal.trim());
      }
    }
    // Also collect any values the pool produces that aren't in the master list.
    for (let i = 0; i < pool.length; i++) {
      for (const value of datasetBuckets[i][di]) {
        const key = String(value).trim().toLowerCase();
        if (key && !candidates.has(key)) candidates.set(key, String(value).trim());
      }
    }
    // Unspecified is always a candidate for bucket dims (may have zero count).
    if (isBucketDim) candidates.set("unspecified", "Unspecified");
    if (candidates.size === 0) continue;

    const labels = [...candidates.values()];
    const counts = new Map<string, number>();

    for (let i = 0; i < pool.length; i++) {
      // Skip datasets that don't satisfy the other selected groups.
      if (!matchesAllOtherGroups(pool[i], filters, dimension)) continue;

      const buckets = datasetBuckets[i][di];

      if (isBucketDim) {
        // EXCLUSIVE single-bucket assignment: each dataset increments exactly
        // one counter. buckets is always [oneBucket] for bucket dimensions.
        const bucket = buckets[0] ?? "Unspecified";
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
      } else {
        // Non-bucket dimensions: multi-value as before.
        for (const label of labels) {
          if (anyValueMatches(dimension, label, buckets)) {
            counts.set(label, (counts.get(label) ?? 0) + 1);
          }
        }
      }
    }

    const list: FacetValue[] = [];
    for (const label of labels) {
      const count = counts.get(label) ?? 0;
      if (masterValues || label.toLowerCase() === "unspecified") {
        // Static dims: always emit the bucket even at zero count.
        list.push({ value: label, count });
      } else {
        if (count > 0) list.push({ value: label, count });
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
    if (a.value.trim().toLowerCase() === "unspecified") return 1;
    if (b.value.trim().toLowerCase() === "unspecified") return -1;
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
  if (dimension === "ageGroup") {
    const idx = MASTER_AGE_GROUP_KEY_VALUES.indexOf(value);
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  }
  if (dimension === "participants" || dimension === "size") {
    const isLessThan = String(value).startsWith("<");
    const m = String(value).match(/(\d+(?:\.\d+)?)/);
    if (!m) return Number.MAX_SAFE_INTEGER;
    const num = parseFloat(m[1]);
    return isLessThan ? num - 0.5 : num;
  }
  if (dimension === "year") {
    const idx = MASTER_YEAR_KEY_VALUES.indexOf(value);
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
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
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  const clean = (s: string) => s.replace(/,/g, " ");

  // Extract license name from raw SPDX / HTTP URLs (e.g., https://spdx.org/licenses/CC0-1.0.html -> CC0-1.0)
  let v = raw;
  if (v.toLowerCase().includes("spdx.org/licenses/") || v.startsWith("http://") || v.startsWith("https://")) {
    try {
      const parts = v.split("/").filter(Boolean);
      let filename = parts[parts.length - 1] || "";
      filename = filename.replace(/\.html?$/i, "");
      if (filename) v = filename;
    } catch {
      // fallback to raw string
    }
  }

  const lower = v.toLowerCase();
  if (["unknown", "none", "n/a", "-", "nan", "null"].includes(lower)) return "Unknown";
  if (["cc0", "cc-0", "cc 0", "cc-zero", "cc0-1.0", "cc0 1.0"].includes(lower)) return "CC0";
  if (lower === "mit") return "MIT";
  if (lower === "pddl") return "PDDL";

  const cc = lower.match(/^(?:cc[- ]?)?(by[-a-z0-9.]*)$/);
  if (cc) {
    const rest = cc[1].replace(/[-.]?1\.0$/, "").replace(/[-.]?4\.0$/, "-4.0").toUpperCase();
    return `CC-${rest}`;
  }

  if (lower.includes("cc0")) return "CC0";
  if (lower.includes("cc-by-nc-sa")) return "CC-BY-NC-SA-4.0";
  if (lower.includes("cc-by-nc")) return "CC-BY-NC-4.0";
  if (lower.includes("cc-by-sa")) return "CC-BY-SA-4.0";
  if (lower.includes("cc-by")) return "CC-BY-4.0";

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
