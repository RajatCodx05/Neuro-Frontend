/**
 * filter-classifications.test.ts
 *
 * Unit tests for the M1-M7 single-bucket classifiers.
 *
 * Covers:
 *  1. Partition invariant — SUM(counts for dimension D) === pool size
 *  2. Boundary cases for participants (50→26-50, 51→51-100, 100→51-100, 101→101+)
 *  3. Year boundaries (2025→2023-2025, 2026→2026+, 2027→2026+)
 *  4. Multi-valued modality — IEEG>EEG precedence
 *  5. Multi-valued disease — first canonical match wins, Others, Unspecified
 *  6. Species classification
 *  7. Size byte parsing and buckets
 *  8. Partition invariant after cross-filter selections (multi-filter state)
 */

import { describe, it, expect } from 'vitest';
import {
  classifyModality,
  classifyDisease,
  classifySpecies,
  classifyYear,
  classifyParticipants,
  classifySize,
  MODALITY_BUCKETS,
  DISEASE_BUCKETS,
  SPECIES_BUCKETS,
  YEAR_BUCKETS,
  PARTICIPANTS_BUCKETS,
  SIZE_BUCKETS,
} from '../src/lib/filter-classifications';
import {
  computeFacets,
  applyFilters,
  canonicalizeDimensionValue,
  normalizeDimensions,
  MASTER_MODALITY_KEY_VALUES,
  MASTER_DISEASE_KEY_VALUES,
  MASTER_SPECIES_KEY_VALUES,
  MASTER_YEAR_KEY_VALUES,
  MASTER_PARTICIPANTS_KEY_VALUES,
  MASTER_SIZE_KEY_VALUES,
} from '../src/lib/search-filters';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDataset(overrides: Record<string, unknown>) {
  return {
    title: 'Test Dataset',
    source: 'openneuro',
    source_id: Math.random().toString(36).substring(2),
    ...overrides,
  };
}

function sumFacetCounts(facets: Record<string, Array<{value: string; count: number}>>, dim: string) {
  return (facets[dim] ?? []).reduce((s, f) => s + f.count, 0);
}

// ─── classifyModality ─────────────────────────────────────────────────────────

describe('classifyModality', () => {
  it('collapses fMRI to MRI', () => {
    expect(classifyModality(['fmri'])).toBe('MRI');
    expect(classifyModality('functional mri')).toBe('MRI');
    expect(classifyModality(['fMRI', 'bold'])).toBe('MRI');
  });

  it('collapses sMRI/DTI to MRI', () => {
    expect(classifyModality(['smri'])).toBe('MRI');
    expect(classifyModality(['dti'])).toBe('MRI');
    expect(classifyModality(['diffusion'])).toBe('MRI');
  });

  it('classifies EEG', () => {
    expect(classifyModality(['eeg'])).toBe('EEG');
    expect(classifyModality(['electroencephalography'])).toBe('EEG');
  });

  it('IEEG takes precedence over EEG — critical M2 rule', () => {
    expect(classifyModality(['ieeg'])).toBe('IEEG');
    expect(classifyModality(['ecog'])).toBe('IEEG');
    expect(classifyModality(['ieeg', 'eeg'])).toBe('IEEG');
    expect(classifyModality(['intracranial eeg'])).toBe('IEEG');
    // A dataset tagged ecog must NOT also appear as EEG
    const bucket = classifyModality(['ecog', 'eeg']);
    expect(bucket).toBe('IEEG');
    expect(bucket).not.toBe('EEG');
  });

  it('classifies MEG, PET, fNIRS', () => {
    expect(classifyModality(['meg'])).toBe('MEG');
    expect(classifyModality(['magnetoencephalography'])).toBe('MEG');
    expect(classifyModality(['pet'])).toBe('PET');
    expect(classifyModality(['fnirs'])).toBe('fNIRS');
    expect(classifyModality(['nirs'])).toBe('fNIRS');
  });

  it('returns Unspecified for empty/null/sentinel', () => {
    expect(classifyModality([])).toBe('Unspecified');
    expect(classifyModality(null)).toBe('Unspecified');
    expect(classifyModality('none')).toBe('Unspecified');
    expect(classifyModality('')).toBe('Unspecified');
  });

  it('always returns one of the 7 canonical buckets', () => {
    const inputs = [['fmri'], ['eeg'], ['ieeg'], ['ecog'], ['meg'], ['pet'], ['fnirs'], ['nirs'], ['mri'], [], ['unknown_modality']];
    for (const inp of inputs) {
      const bucket = classifyModality(inp);
      expect(MODALITY_BUCKETS).toContain(bucket);
    }
  });
});

// ─── classifyParticipants — exact boundary tests (M6) ─────────────────────────

describe('classifyParticipants — exact boundaries', () => {
  it('1 → 1–25', () => expect(classifyParticipants(1)).toBe('1–25'));
  it('25 → 1–25', () => expect(classifyParticipants(25)).toBe('1–25'));
  it('26 → 26–50', () => expect(classifyParticipants(26)).toBe('26–50'));
  it('50 → 26–50 (NOT 51–100)', () => {
    expect(classifyParticipants(50)).toBe('26–50');
    expect(classifyParticipants(50)).not.toBe('51–100');
  });
  it('51 → 51–100 (NOT 26–50)', () => {
    expect(classifyParticipants(51)).toBe('51–100');
    expect(classifyParticipants(51)).not.toBe('26–50');
  });
  it('100 → 51–100', () => expect(classifyParticipants(100)).toBe('51–100'));
  it('101 → 101+', () => expect(classifyParticipants(101)).toBe('101+'));
  it('null → Unspecified', () => expect(classifyParticipants(null)).toBe('Unspecified'));
  it('0 → Unspecified', () => expect(classifyParticipants(0)).toBe('Unspecified'));
  it('-1 → Unspecified', () => expect(classifyParticipants(-1)).toBe('Unspecified'));
  it('always returns a canonical bucket', () => {
    for (const n of [1, 25, 26, 50, 51, 100, 101, 500, null]) {
      expect(PARTICIPANTS_BUCKETS).toContain(classifyParticipants(n));
    }
  });
});

// ─── classifyYear — M4 boundaries ─────────────────────────────────────────────

describe('classifyYear — M4 boundaries', () => {
  const classify = (y: number) => classifyYear(null, y, null);

  it('2019 → Before 2020', () => expect(classify(2019)).toBe('Before 2020'));
  it('2020 → 2020–2022', () => expect(classify(2020)).toBe('2020–2022'));
  it('2022 → 2020–2022', () => expect(classify(2022)).toBe('2020–2022'));
  it('2023 → 2023–2025', () => expect(classify(2023)).toBe('2023–2025'));
  it('2025 → 2023–2025', () => expect(classify(2025)).toBe('2023–2025'));
  it('2026 → 2026+ (not labeled as exactly 2026)', () => {
    expect(classify(2026)).toBe('2026+');
    expect(classify(2026)).not.toBe('2026');
  });
  it('2027 → 2026+ (future year correctly labeled)', () => {
    expect(classify(2027)).toBe('2026+');
    expect(classify(2027)).not.toBe('2026');
  });
  it('2035 → 2026+', () => expect(classify(2035)).toBe('2026+'));
  it('null/missing → Unspecified', () => expect(classifyYear(null, null, null)).toBe('Unspecified'));
  it('always returns a canonical bucket', () => {
    for (const y of [2010, 2020, 2022, 2023, 2025, 2026, 2027, 2030]) {
      expect(YEAR_BUCKETS).toContain(classify(y));
    }
  });
});

// ─── classifyDisease — M7 ─────────────────────────────────────────────────────

describe('classifyDisease — M7', () => {
  const classify = (d: unknown, kw: unknown = []) => classifyDisease(d, kw);

  it('maps epilepsy variants', () => {
    expect(classify('epilepsy')).toBe('Epilepsy');
    expect(classify('seizure')).toBe('Epilepsy');
    expect(classify('Epileptic')).toBe('Epilepsy');
  });

  it('maps Alzheimer variants', () => {
    expect(classify("Alzheimer's disease")).toBe("Alzheimer's");
    expect(classify('alzheimers')).toBe("Alzheimer's");
  });

  it('multi-valued: first canonical match wins (no double-count)', () => {
    // A dataset with both Epilepsy AND Alzheimer's must produce exactly ONE bucket.
    const bucket = classify(["Epilepsy", "Alzheimer's"]);
    expect(bucket).toBe('Epilepsy'); // Epilepsy appears first
    expect(bucket).not.toBe("Alzheimer's");
  });

  it('valid but unknown disease → Others', () => {
    expect(classify('Major Depressive Disorder')).toBe('Others');
    expect(classify('Multiple Sclerosis')).toBe('Others');
  });

  it('missing/sentinel → Unspecified', () => {
    expect(classify(null)).toBe('Unspecified');
    expect(classify('')).toBe('Unspecified');
    expect(classify('none')).toBe('Unspecified');
    expect(classify([])).toBe('Unspecified');
  });

  it('always returns a canonical bucket', () => {
    const inputs: unknown[] = ['epilepsy', 'alzheimer', ['Epilepsy', "Alzheimer's"], 'MS', null, ''];
    for (const inp of inputs) {
      expect(DISEASE_BUCKETS).toContain(classify(inp));
    }
  });
});

// ─── classifySpecies — M5 ────────────────────────────────────────────────────

describe('classifySpecies — M5', () => {
  it('human variants → Human', () => {
    expect(classifySpecies(['humans'])).toBe('Human');
    expect(classifySpecies(['homo sapiens'])).toBe('Human');
    expect(classifySpecies(['participants'])).toBe('Human');
    expect(classifySpecies(['patients'])).toBe('Human');
  });
  it('non-human → Animal', () => {
    expect(classifySpecies(['mouse'])).toBe('Animal');
    expect(classifySpecies(['rat'])).toBe('Animal');
    expect(classifySpecies(['macaque'])).toBe('Animal');
  });
  it('empty → Unspecified', () => {
    expect(classifySpecies([])).toBe('Unspecified');
    expect(classifySpecies(null)).toBe('Unspecified');
  });
});

// ─── classifySize — M3 ────────────────────────────────────────────────────────

describe('classifySize — M3', () => {
  const GB = 1024 ** 3;
  it('<10 GB', () => expect(classifySize(5 * GB, null)).toBe('<10 GB'));
  it('exactly 10 GB → 10–100 GB', () => expect(classifySize(10 * GB, null)).toBe('10–100 GB'));
  it('50 GB → 10–100 GB', () => expect(classifySize(50 * GB, null)).toBe('10–100 GB'));
  it('100 GB → 10–100 GB', () => expect(classifySize(100 * GB, null)).toBe('10–100 GB'));
  it('200 GB → 100–500 GB', () => expect(classifySize(200 * GB, null)).toBe('100–500 GB'));
  it('500 GB → 100–500 GB', () => expect(classifySize(500 * GB, null)).toBe('100–500 GB'));
  it('501 GB → 500 GB+', () => expect(classifySize(501 * GB, null)).toBe('500 GB+'));
  it('label fallback: "184 GB" → 100–500 GB', () => expect(classifySize(null, '184 GB')).toBe('100–500 GB'));
  it('null → Unspecified', () => expect(classifySize(null, null)).toBe('Unspecified'));
});

// ─── Partition invariant tests ─────────────────────────────────────────────────

/**
 * Generate a heterogeneous pool that stresses all 6 bucket dimensions.
 * Note: disease multi-value was the original 22+8+1=31 bug case.
 */
function makeStressPool() {
  return [
    // Reproduces the 22+1+8=31 bug case: multi-valued disease
    makeDataset({ disease: "Epilepsy", modality: ['eeg'], species: ['humans'], subject_count: 30, size_bytes: 5 * 1024**3, publication_year: 2021 }),
    makeDataset({ disease: "Alzheimer's", modality: ['fmri'], species: ['humans'], subject_count: 120, size_bytes: 200 * 1024**3, publication_year: 2024 }),
    makeDataset({ disease: 'healthy controls', modality: ['mri'], species: ['humans'], subject_count: 50, size_bytes: 15 * 1024**3, publication_year: 2019 }),
    makeDataset({ disease: null, modality: ['ieeg'], species: ['macaque'], subject_count: 10, size_bytes: null, publication_year: null }),
    makeDataset({ disease: 'epilepsy', modality: ['meg'], species: ['humans'], subject_count: 75, size_bytes: 600 * 1024**3, publication_year: 2026 }),
    makeDataset({ disease: 'autism spectrum disorder', modality: ['eeg', 'mri'], species: ['children'], subject_count: 51, size_bytes: 50 * 1024**3, publication_year: 2023 }),
    makeDataset({ disease: 'multiple sclerosis', modality: ['fnirs'], species: ['rats'], subject_count: null, size_bytes: 80 * 1024**3, publication_year: 2027 }),
    makeDataset({ disease: "Parkinson's", modality: ['pet'], species: ['humans'], subject_count: 25, size_bytes: 8 * 1024**3, publication_year: 2022 }),
    makeDataset({ disease: 'schizophrenia', modality: ['smri'], species: ['homo sapiens'], subject_count: 100, size_bytes: 450 * 1024**3, publication_year: 2025 }),
    makeDataset({ disease: 'adhd', modality: ['dti'], species: ['participants'], subject_count: 26, size_bytes: 101 * 1024**3, publication_year: 2020 }),
  ];
}

describe('Partition invariant — SUM(counts) === pool size for bucket dimensions', () => {
  const pool = makeStressPool();
  const facets = computeFacets(pool, {}) as Record<string, Array<{value: string; count: number}>>;

  const BUCKET_DIMS = ['modality', 'disease', 'species', 'year', 'participants', 'size'] as const;

  for (const dim of BUCKET_DIMS) {
    it(`${dim}: SUM(counts) === ${pool.length}`, () => {
      const total = sumFacetCounts(facets, dim);
      expect(total).toBe(pool.length);
    });
  }

  it('Reproduces 22+8+1=31 bug: Epilepsy+Alzheimer multi-disease dataset counts only once', () => {
    // A pool with a dataset that has two disease mentions
    const bugPool = [
      ...Array(22).fill(null).map((_, i) => makeDataset({ disease: 'epilepsy', modality: ['eeg'], subject_count: i + 1 })),
      ...Array(8).fill(null).map((_, i) => makeDataset({ disease: 'unspecified', modality: ['mri'], subject_count: null })),
      makeDataset({ disease: ["Epilepsy", "Alzheimer's"], modality: ['fmri'], subject_count: 5 }),
    ];
    const bugFacets = computeFacets(bugPool, {}) as Record<string, Array<{value: string; count: number}>>;
    const total = sumFacetCounts(bugFacets, 'disease');
    expect(total).toBe(bugPool.length); // Must be 31, not 32
    expect(total).not.toBeGreaterThan(bugPool.length);
  });
});

describe('Partition invariant — after multi-filter selection (cross-filter)', () => {
  it('SUM(disease counts) === remaining eligible pool after EEG filter applied', () => {
    const pool = makeStressPool();
    const filters = { modality: ['EEG'] };

    // Apply the EEG filter to get the visible pool
    const filtered = applyFilters(pool, filters);

    // computeFacets with EEG active: disease counts should sum to filtered pool size
    const facets = computeFacets(pool, filters) as Record<string, Array<{value: string; count: number}>>;
    const diseaseTotal = sumFacetCounts(facets, 'disease');
    expect(diseaseTotal).toBe(filtered.length);
  });

  it('SUM(modality counts) === remaining eligible pool after Human filter applied', () => {
    const pool = makeStressPool();
    const filters = { species: ['Human'] };
    const filtered = applyFilters(pool, filters);
    const facets = computeFacets(pool, filters) as Record<string, Array<{value: string; count: number}>>;
    const modalityTotal = sumFacetCounts(facets, 'modality');
    expect(modalityTotal).toBe(filtered.length);
  });

  it('SUM(year counts) === remaining pool after Epilepsy disease filter', () => {
    const pool = makeStressPool();
    const filters = { disease: ['Epilepsy'] };
    const filtered = applyFilters(pool, filters);
    const facets = computeFacets(pool, filters) as Record<string, Array<{value: string; count: number}>>;
    const yearTotal = sumFacetCounts(facets, 'year');
    expect(yearTotal).toBe(filtered.length);
  });
});

describe('Master key lists match canonical bucket constants', () => {
  it('MASTER_MODALITY_KEY_VALUES === 7 items (no fMRI/sMRI/DTI)', () => {
    expect(MASTER_MODALITY_KEY_VALUES).toHaveLength(7);
    expect(MASTER_MODALITY_KEY_VALUES).not.toContain('fMRI');
    expect(MASTER_MODALITY_KEY_VALUES).not.toContain('sMRI');
    expect(MASTER_MODALITY_KEY_VALUES).toContain('MRI');
    expect(MASTER_MODALITY_KEY_VALUES).toContain('IEEG');
  });
  it('MASTER_YEAR_KEY_VALUES contains 2026+ not 2025+', () => {
    expect(MASTER_YEAR_KEY_VALUES).toContain('2026+');
    expect(MASTER_YEAR_KEY_VALUES).not.toContain('2025+');
    expect(MASTER_YEAR_KEY_VALUES).not.toContain('2026');
  });
  it('MASTER_PARTICIPANTS_KEY_VALUES has non-overlapping boundaries', () => {
    expect(MASTER_PARTICIPANTS_KEY_VALUES).toContain('51–100');
    expect(MASTER_PARTICIPANTS_KEY_VALUES).toContain('101+');
    expect(MASTER_PARTICIPANTS_KEY_VALUES).not.toContain('50–100');
    expect(MASTER_PARTICIPANTS_KEY_VALUES).not.toContain('100+');
  });
  it('MASTER_DISEASE_KEY_VALUES includes Others', () => {
    expect(MASTER_DISEASE_KEY_VALUES).toContain('Others');
    expect(MASTER_DISEASE_KEY_VALUES).toContain('Unspecified');
  });
  it('MASTER_SPECIES_KEY_VALUES has exactly 3 items', () => {
    expect(MASTER_SPECIES_KEY_VALUES).toHaveLength(3);
    expect(MASTER_SPECIES_KEY_VALUES).toContain('Human');
    expect(MASTER_SPECIES_KEY_VALUES).toContain('Animal');
    expect(MASTER_SPECIES_KEY_VALUES).not.toContain('Mouse');
    expect(MASTER_SPECIES_KEY_VALUES).not.toContain('Rat');
  });
});

describe('Focused UI contract fixes (A-F)', () => {
  it('A. fMRI canonicalizes to MRI (never fMRI UI option)', () => {
    expect(canonicalizeDimensionValue('modality', 'fMRI')).toBe('MRI');
    expect(canonicalizeDimensionValue('modality', 'fmri')).toBe('MRI');
    expect(canonicalizeDimensionValue('modality', 'functional mri')).toBe('MRI');
  });

  it('B. sMRI canonicalizes to MRI', () => {
    expect(canonicalizeDimensionValue('modality', 'sMRI')).toBe('MRI');
    expect(canonicalizeDimensionValue('modality', 'smri')).toBe('MRI');
    expect(canonicalizeDimensionValue('modality', 'dti')).toBe('MRI');
  });

  it('C. Disease query "seizure disorders" canonicalizes to Others (never Seizure disorders option)', () => {
    expect(canonicalizeDimensionValue('disease', 'seizure disorders')).toBe('Others');
    expect(canonicalizeDimensionValue('disease', 'seizure disorder')).toBe('Others');
  });

  it('D. Unknown disease "migraine" canonicalizes to Others', () => {
    expect(canonicalizeDimensionValue('disease', 'migraine')).toBe('Others');
    expect(canonicalizeDimensionValue('disease', 'stroke')).toBe('Others');
    expect(canonicalizeDimensionValue('disease', 'multiple sclerosis')).toBe('Others');
  });

  it('E. Canonical 8 diseases map to exact canonical strings', () => {
    expect(canonicalizeDimensionValue('disease', 'epilepsy')).toBe('Epilepsy');
    expect(canonicalizeDimensionValue('disease', 'alzheimers')).toBe("Alzheimer's");
    expect(canonicalizeDimensionValue('disease', 'adhd')).toBe('ADHD');
  });

  it('F. Multi-condition query intent does not create unmapped options', () => {
    const rawParsed = { modality: ['EEG'], condition: ['epilepsy', "Alzheimer's disease"] };
    const normalized = normalizeDimensions(rawParsed);
    expect(normalized.modality).toEqual(['EEG']);
    expect(normalized.disease).toEqual(['Epilepsy', "Alzheimer's"]);
  });
});
