/**
 * filter-classifications.ts — canonical single-bucket classifiers (M1–M7).
 *
 * Every function maps raw dataset metadata → exactly ONE display bucket.
 * This is the single source of truth used by:
 *   - computeFacets (frontend facet counting)
 *   - dimensionFieldSources (frontend filter matching)
 *   - extractHardConstraints (backend MongoDB hard constraints)
 *   - buildMongoQuery (legacy backend path)
 *
 * Partition invariant: each classifyXxx always returns one non-empty string.
 * SUM(all bucket counts for dimension D) === eligible pool size, by construction.
 */

// ─── Shared sentinel helpers ──────────────────────────────────────────────────

const NONE_SENTINELS = new Set(["none", "null", "nan", "n/a", "-", "", "undefined"]);

function isSentinel(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  return NONE_SENTINELS.has(String(v).trim().toLowerCase());
}

/** Expand a raw metadata value: parse Python-stringified lists, split semicolons/pipes. */
export function expandRaw(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(expandRaw);
  if (value === null || value === undefined) return [];
  const s = String(value).trim();
  if (!s || NONE_SENTINELS.has(s.toLowerCase())) return [];
  // Python-stringified list: "['meg']"
  const listMatch = s.match(/^\[(.*)\]$/s);
  if (listMatch) {
    const inner = listMatch[1].trim();
    if (inner && (inner.includes("'") || inner.includes('"'))) {
      const parts = inner
        .split(/\s*'\s*,\s*'|\s*"\s*,\s*"/)
        .map((p) => p.replace(/^['"]|['"]$/g, "").trim())
        .filter(Boolean);
      if (parts.length > 0) return parts.flatMap(expandRaw);
    }
  }
  // Semicolon/pipe separated
  if (/[;|]/.test(s)) return s.split(/[;|]/).flatMap((p) => expandRaw(p.trim()));
  return [s];
}

// ─── M2: Modality ─────────────────────────────────────────────────────────────
// Canonical UI buckets: MRI | EEG | IEEG | PET | MEG | fNIRS | Unspecified
//
// Precedence rule (strictly ordered — first match wins):
//   1. IEEG / intracranial — checked BEFORE EEG so a dataset tagged ieeg/ecog
//      does NOT also count as EEG.
//   2. MEG
//   3. fNIRS / NIRS
//   4. PET
//   5. EEG (electrophysiology family)
//   6. MRI (all structural/functional/diffusion sub-types collapse here)
//   7. Unspecified

export const MODALITY_BUCKETS = ["MRI", "EEG", "IEEG", "PET", "MEG", "fNIRS", "Unspecified"] as const;
export type ModalityBucket = (typeof MODALITY_BUCKETS)[number];

const IEEG_TOKENS = ["ieeg", "intracranial eeg", "intracranial electroencephalography", "ecog", "electrocorticography", "seeg", "stereoelectroencephalography"];
const MEG_TOKENS = ["meg", "magnetoencephalography"];
const FNIRS_TOKENS = ["fnirs", "nirs", "near-infrared spectroscopy", "near infrared spectroscopy"];
const PET_TOKENS = ["pet", "positron emission tomography"];
// EEG — does NOT include intracranial terms (handled above by IEEG).
const EEG_TOKENS = ["eeg", "electroencephalography", "electroencephalogram", "electrophysiology", "ecg", "emg", "electrocardiography", "electromyography", "lfp", "local field potential"];
// MRI — all sub-types collapse here.
const MRI_TOKENS = ["mri", "fmri", "smri", "structural mri", "functional mri", "functional magnetic resonance imaging", "structural magnetic resonance imaging", "magnetic resonance imaging", "dti", "dwi", "diffusion", "t1w", "t2w", "bold", "anat", "func"];

function tokenHit(value: string, tokens: string[]): boolean {
  const v = value.toLowerCase();
  return tokens.some((t) => v.includes(t));
}

/**
 * Classify a dataset into exactly one Modality bucket.
 * rawValues: all raw modality values from the dataset (array or string).
 *
 * ponytail: precedence is applied over the merged joined string.
 */
export function classifyModality(rawValues: unknown): ModalityBucket {
  const values = expandRaw(rawValues);
  if (values.length === 0) return "Unspecified";

  const joined = values.join(" ").toLowerCase();
  if (tokenHit(joined, IEEG_TOKENS)) return "IEEG";
  if (tokenHit(joined, MEG_TOKENS))  return "MEG";
  if (tokenHit(joined, FNIRS_TOKENS)) return "fNIRS";
  if (tokenHit(joined, PET_TOKENS))  return "PET";
  if (tokenHit(joined, EEG_TOKENS))  return "EEG";
  if (tokenHit(joined, MRI_TOKENS))  return "MRI";
  return "Unspecified";
}

/** Backend: translate a UI modality bucket to raw token set for MongoDB $or regex. */
export function modalityBucketToTokens(bucket: string): string[] {
  const b = bucket.trim().toLowerCase();
  if (b === "mri")   return [...MRI_TOKENS];
  if (b === "eeg")   return [...EEG_TOKENS];
  if (b === "ieeg")  return [...IEEG_TOKENS];
  if (b === "meg")   return [...MEG_TOKENS];
  if (b === "fnirs") return [...FNIRS_TOKENS];
  if (b === "pet")   return [...PET_TOKENS];
  return [b]; // Unspecified passthrough
}

// ─── M7: Disease ─────────────────────────────────────────────────────────────
// 8 canonical labels + Others + Unspecified.

export const DISEASE_CANONICAL = [
  "ADHD",
  "Alzheimer's",
  "Autism",
  "Bipolar",
  "Epilepsy",
  "Healthy",
  "Parkinson's",
  "Schizophrenia",
] as const;

export const DISEASE_BUCKETS = [...DISEASE_CANONICAL, "Others", "Unspecified"] as const;
export type DiseaseBucket = (typeof DISEASE_BUCKETS)[number];

const DISEASE_VOCAB: Record<string, typeof DISEASE_CANONICAL[number]> = {
  adhd: "ADHD",
  "attention deficit hyperactivity disorder": "ADHD",
  "attention deficit disorder": "ADHD",
  add: "ADHD",

  alzheimer: "Alzheimer's",
  "alzheimer's": "Alzheimer's",
  alzheimers: "Alzheimer's",
  "alzheimer disease": "Alzheimer's",
  "alzheimers disease": "Alzheimer's",
  "alzheimer's disease": "Alzheimer's",

  autism: "Autism",
  autistic: "Autism",
  asd: "Autism",
  "autism spectrum disorder": "Autism",
  "autism spectrum": "Autism",

  bipolar: "Bipolar",
  "bipolar disorder": "Bipolar",
  "manic depression": "Bipolar",
  "manic-depressive": "Bipolar",

  epilepsy: "Epilepsy",
  epileptic: "Epilepsy",
  epileptiform: "Epilepsy",
  seizure: "Epilepsy",
  seizures: "Epilepsy",

  healthy: "Healthy",
  "healthy control": "Healthy",
  "healthy controls": "Healthy",
  "normal control": "Healthy",
  "normal controls": "Healthy",
  control: "Healthy",
  controls: "Healthy",

  parkinson: "Parkinson's",
  "parkinson's": "Parkinson's",
  parkinsons: "Parkinson's",
  "parkinson disease": "Parkinson's",
  "parkinson's disease": "Parkinson's",

  schizophrenia: "Schizophrenia",
  schizophrenic: "Schizophrenia",
  psychosis: "Schizophrenia",
  psychotic: "Schizophrenia",
};

function matchDiseaseToken(token: string): typeof DISEASE_CANONICAL[number] | null {
  const t = token.trim().toLowerCase().replace(/\u2019/g, "'");
  if (!t || NONE_SENTINELS.has(t)) return null;
  if (DISEASE_VOCAB[t]) return DISEASE_VOCAB[t];
  // Substring match
  for (const [key, label] of Object.entries(DISEASE_VOCAB)) {
    if (t.includes(key) || key.includes(t)) return label;
  }
  return null;
}

/**
 * Classify a dataset into exactly one Disease bucket.
 * rawDisease: structured disease field (string or array).
 * rawKeywords: keywords array (secondary evidence).
 */
export function classifyDisease(rawDisease: unknown, rawKeywords: unknown): DiseaseBucket {
  const diseaseValues = expandRaw(rawDisease);
  for (const v of diseaseValues) {
    const match = matchDiseaseToken(v);
    if (match) return match;
  }
  const kwValues = expandRaw(rawKeywords);
  for (const v of kwValues) {
    const match = matchDiseaseToken(v);
    if (match) return match;
  }
  // Has content but didn't match canonical → Others
  if (diseaseValues.length > 0) return "Others";
  return "Unspecified";
}

// ─── M5: Species ─────────────────────────────────────────────────────────────

export const SPECIES_BUCKETS = ["Human", "Animal", "Unspecified"] as const;
export type SpeciesBucket = (typeof SPECIES_BUCKETS)[number];

const HUMAN_TOKENS = [
  "human", "humans", "homo sapiens", "homo_sapiens", "participant", "participants",
  "healthy volunteer", "healthy volunteers", "subject", "subjects", "person", "people",
  "patient", "patients", "adult", "adults", "child", "children",
];

/**
 * Classify a dataset into exactly one Species bucket.
 * Human takes precedence. Any non-human non-null species → Animal.
 */
export function classifySpecies(rawValues: unknown): SpeciesBucket {
  const values = expandRaw(rawValues);
  if (values.length === 0) return "Unspecified";
  const joined = values.join(" ").toLowerCase();
  if (HUMAN_TOKENS.some((t) => joined.includes(t))) return "Human";
  return "Animal";
}

/** Backend: translate Species bucket → query terms. */
export function speciesBucketToTokens(bucket: string): { type: "human" | "animal" | "unspecified"; tokens: string[] } {
  const b = bucket.trim().toLowerCase();
  if (b === "human")  return { type: "human",       tokens: HUMAN_TOKENS };
  if (b === "animal") return { type: "animal",       tokens: HUMAN_TOKENS }; // $nin these
  return               { type: "unspecified", tokens: [] };
}

// ─── M4: Publication Year ─────────────────────────────────────────────────────
// Buckets: Before 2020 | 2020–2022 | 2023–2025 | 2026+ | Unspecified
// year >= 2026 → "2026+" (2027, 2028, etc. are correctly labeled 2026+)

export const YEAR_BUCKETS = ["Before 2020", "2020–2022", "2023–2025", "2026+", "Unspecified"] as const;
export type YearBucket = (typeof YEAR_BUCKETS)[number];

export function extractYear(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || NONE_SENTINELS.has(s.toLowerCase())) return null;
  const n = Number(s);
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) return n;
  const m = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (m) {
    const y = parseInt(m[1], 10);
    if (y >= 1900 && y <= 2100) return y;
  }
  return null;
}

/**
 * Classify publication date/year into exactly one Year bucket.
 * Tries published_at, then publication_year, then date_published.
 */
export function classifyYear(
  rawPublishedAt: unknown,
  rawPublicationYear: unknown,
  rawDatePublished: unknown,
): YearBucket {
  const year =
    extractYear(rawPublishedAt) ??
    extractYear(rawPublicationYear) ??
    extractYear(rawDatePublished);

  if (year === null) return "Unspecified";
  if (year < 2020)   return "Before 2020";
  if (year <= 2022)  return "2020–2022";
  if (year <= 2025)  return "2023–2025";
  return "2026+"; // year >= 2026 (includes 2027, 2028, ...)
}

/** Backend: convert Year bucket to numeric year range. */
export function yearBucketToRange(bucket: string): { gte: number | null; lt: number | null } {
  switch (bucket) {
    case "Before 2020": return { gte: null, lt: 2020 };
    case "2020–2022":   return { gte: 2020, lt: 2023 };
    case "2023–2025":   return { gte: 2023, lt: 2026 };
    case "2026+":       return { gte: 2026, lt: null };
    default:            return { gte: null, lt: null };
  }
}

// ─── M6: Participants ─────────────────────────────────────────────────────────
// Non-overlapping: 1–25 | 26–50 | 51–100 | 101+ | Unspecified.
// Exact: 50 → 26–50, 51 → 51–100, 100 → 51–100, 101 → 101+.

export const PARTICIPANTS_BUCKETS = ["1–25", "26–50", "51–100", "101+", "Unspecified"] as const;
export type ParticipantsBucket = (typeof PARTICIPANTS_BUCKETS)[number];

export function parseSubjectCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(String(value).trim().replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

/** Classify subject_count into exactly one Participants bucket. */
export function classifyParticipants(rawCount: unknown): ParticipantsBucket {
  const n = parseSubjectCount(rawCount);
  if (n === null) return "Unspecified";
  if (n <= 25)   return "1–25";
  if (n <= 50)   return "26–50";
  if (n <= 100)  return "51–100";
  return "101+";
}

/** Backend: convert Participants bucket to MongoDB $gte/$lte. */
export function participantsBucketToRange(bucket: string): { gte: number | null; lte: number | null } {
  switch (bucket) {
    case "1–25":   return { gte: 1,   lte: 25 };
    case "26–50":  return { gte: 26,  lte: 50 };
    case "51–100": return { gte: 51,  lte: 100 };
    case "101+":   return { gte: 101, lte: null };
    default:       return { gte: null, lte: null };
  }
}

// ─── M3: Dataset Size ─────────────────────────────────────────────────────────
// Buckets: <10 GB | 10–100 GB | 100–500 GB | 500 GB+ | Unspecified.

export const SIZE_BUCKETS = ["<10 GB", "10–100 GB", "100–500 GB", "500 GB+", "Unspecified"] as const;
export type SizeBucket = (typeof SIZE_BUCKETS)[number];

const SIZE_UNIT: Record<string, number> = {
  b: 1, byte: 1, bytes: 1,
  kb: 1024, kilobyte: 1024, kilobytes: 1024,
  mb: 1024 ** 2, megabyte: 1024 ** 2, megabytes: 1024 ** 2,
  gb: 1024 ** 3, gigabyte: 1024 ** 3, gigabytes: 1024 ** 3,
  tb: 1024 ** 4, terabyte: 1024 ** 4, terabytes: 1024 ** 4,
  pb: 1024 ** 5, petabyte: 1024 ** 5, petabytes: 1024 ** 5,
};

export function parseSizeBytes(sizeBytes: unknown, sizeLabel: unknown): number | null {
  if (typeof sizeBytes === "number" && Number.isFinite(sizeBytes) && sizeBytes > 0) return sizeBytes;
  const src = sizeBytes != null ? sizeBytes : sizeLabel;
  if (src === null || src === undefined) return null;
  const s = String(src).trim().toLowerCase();
  if (!s || NONE_SENTINELS.has(s)) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*([a-z]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = SIZE_UNIT[m[2]];
  if (!mult || !Number.isFinite(n) || n <= 0) return null;
  return n * mult;
}

const GB = 1024 ** 3;

/** Classify size fields into exactly one Size bucket. */
export function classifySize(rawSizeBytes: unknown, rawSizeLabel: unknown): SizeBucket {
  const bytes = parseSizeBytes(rawSizeBytes, rawSizeLabel);
  if (bytes === null) return "Unspecified";
  const gb = bytes / GB;
  if (gb < 10)   return "<10 GB";
  if (gb <= 100) return "10–100 GB";
  if (gb <= 500) return "100–500 GB";
  return "500 GB+";
}

/** Backend: convert Size bucket to byte range predicates. */
export function sizeBucketToByteRange(bucket: string): { gte: number | null; lt: number | null } {
  switch (bucket) {
    case "<10 GB":     return { gte: null,     lt: 10 * GB };
    case "10–100 GB":  return { gte: 10 * GB,  lt: 101 * GB };
    case "100–500 GB": return { gte: 100 * GB, lt: 501 * GB };
    case "500 GB+":    return { gte: 500 * GB, lt: null };
    default:           return { gte: null, lt: null };
  }
}

// ─── Unused export to satisfy linter on isSentinel ────────────────────────────
export { isSentinel };
