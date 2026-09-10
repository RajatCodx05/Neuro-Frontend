import { describe, it, expect } from 'vitest';
import { classifyDisease } from '../src/lib/filter-classifications';
import {
  dimensionFieldSources,
  computeFacets,
  matchesFilter,
  applyFilters,
  PAGE_SIZE,
  type RawDataset,
} from '../src/lib/search-filters';

function makeDataset(overrides: Partial<RawDataset> = {}): RawDataset {
  return {
    _id: `ds-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Dataset',
    source: 'openneuro',
    source_id: 'ds000001',
    modality: ['mri'],
    species: ['human'],
    disease: null,
    keywords: [],
    subject_count: 20,
    publication_year: 2022,
    size_bytes: 1024 ** 3,
    ...overrides,
  };
}

describe('Phase 2 — Multi-Bucket Disease and Task Classification', () => {
  // ─── Disease Classification (1-9) ──────────────────────────────────────────

  describe('Disease Classifier', () => {
    it('1. single disease → single bucket array', () => {
      expect(classifyDisease('epilepsy', [])).toEqual(['Epilepsy']);
      expect(classifyDisease('parkinson disease', [])).toEqual(["Parkinson's"]);
    });

    it('2. two diseases → both buckets preserved', () => {
      expect(classifyDisease(['alzheimer', 'parkinson'], [])).toEqual([
        "Alzheimer's",
        "Parkinson's",
      ]);
    });

    it('3. disease + healthy → both buckets preserved', () => {
      expect(classifyDisease(['parkinson', 'healthy'], [])).toEqual([
        "Parkinson's",
        'Healthy',
      ]);
      expect(classifyDisease(['healthy control', 'epilepsy'], [])).toEqual([
        'Healthy',
        'Epilepsy',
      ]);
    });

    it('4. three diseases → all three buckets preserved', () => {
      expect(classifyDisease(['adhd', 'autism spectrum disorder', 'bipolar'], [])).toEqual([
        'ADHD',
        'Autism',
        'Bipolar',
      ]);
    });

    it('5. duplicate disease values → deduplicated canonical bucket', () => {
      expect(classifyDisease(['epilepsy', 'seizure', 'epileptic'], [])).toEqual(['Epilepsy']);
      expect(classifyDisease(["alzheimer's", 'alzheimers', 'alzheimer disease'], [])).toEqual([
        "Alzheimer's",
      ]);
    });

    it('6. disease in keywords + disease field → merged and deduplicated', () => {
      expect(classifyDisease('alzheimer', ['adhd', 'healthy control'])).toEqual([
        "Alzheimer's",
        'ADHD',
        'Healthy',
      ]);
      expect(classifyDisease('epilepsy', ['seizure', 'autism'])).toEqual([
        'Epilepsy',
        'Autism',
      ]);
    });

    it('7. no disease → Unspecified', () => {
      expect(classifyDisease(null, [])).toEqual(['Unspecified']);
      expect(classifyDisease('', [])).toEqual(['Unspecified']);
      expect(classifyDisease([], [])).toEqual(['Unspecified']);
      expect(classifyDisease('none', ['n/a'])).toEqual(['Unspecified']);
    });

    it('8. unknown disease → Others', () => {
      expect(classifyDisease('stroke', [])).toEqual(['Others']);
      expect(classifyDisease(['multiple sclerosis', 'chronic migraine'], [])).toEqual(['Others']);
    });

    it('9. mixed known + unknown → canonical match returned', () => {
      expect(classifyDisease(['epilepsy', 'stroke'], [])).toEqual(['Epilepsy']);
      expect(classifyDisease(['major depression', "parkinson's"], [])).toEqual(["Parkinson's"]);
    });
  });

  // ─── Task Sources (10-15) ──────────────────────────────────────────────────

  describe('Task Sources & Classification', () => {
    it('10. multiple keywords parsed into task dimension', () => {
      const ds = makeDataset({ keywords: ['motor task', 'memory'] });
      expect(dimensionFieldSources(ds, 'task')).toEqual(['motor task', 'memory']);
    });

    it('11. dataset.task is recognized and extracted', () => {
      const ds = makeDataset({ task: 'working-memory' });
      expect(dimensionFieldSources(ds, 'task')).toEqual(['working-memory']);
    });

    it('12. dataset.tasks array is recognized and extracted', () => {
      const ds = makeDataset({ tasks: ['resting-state', 'language'] });
      expect(dimensionFieldSources(ds, 'task')).toEqual(['resting-state', 'language']);
    });

    it('13. task + keywords are merged and preserved', () => {
      const ds = makeDataset({ task: 'working-memory', keywords: ['memory task', 'fMRI'] });
      expect(dimensionFieldSources(ds, 'task')).toEqual(['working-memory', 'memory task', 'fMRI']);
    });

    it('14. duplicate task values across task, tasks, keywords are deduplicated', () => {
      const ds = makeDataset({
        task: 'motor',
        tasks: ['motor', 'resting-state'],
        keywords: ['motor', 'resting-state', 'language'],
      });
      expect(dimensionFieldSources(ds, 'task')).toEqual(['motor', 'resting-state', 'language']);
    });

    it('15. multiple tasks preserved with deterministic order', () => {
      const ds = makeDataset({
        task: 'resting-state',
        tasks: ['working-memory'],
        keywords: ['attention task, language'],
      });
      expect(dimensionFieldSources(ds, 'task')).toEqual([
        'resting-state',
        'working-memory',
        'attention task',
        'language',
      ]);
    });
  });

  // ─── Facet Computation (16-18) ─────────────────────────────────────────────

  describe('Facet Computation for Multi-Bucket Dimensions', () => {
    it('16. multi-disease dataset increments every assigned bucket', () => {
      const pool = [
        makeDataset({ disease: ['parkinson', 'healthy'] }),
        makeDataset({ disease: 'parkinson' }),
        makeDataset({ disease: null }),
      ];
      const facets = computeFacets(pool, {});
      const parkinson = facets.disease?.find((f) => f.value === "Parkinson's")?.count;
      const healthy = facets.disease?.find((f) => f.value === 'Healthy')?.count;
      const unspecified = facets.disease?.find((f) => f.value === 'Unspecified')?.count;

      expect(parkinson).toBe(2); // 1 dual + 1 single
      expect(healthy).toBe(1);   // 1 dual
      expect(unspecified).toBe(1);
    });

    it('17. duplicate bucket in one dataset is counted only once', () => {
      const pool = [
        makeDataset({ disease: ['epilepsy', 'seizures', 'epileptic'] }),
      ];
      const facets = computeFacets(pool, {});
      const epilepsy = facets.disease?.find((f) => f.value === 'Epilepsy')?.count;
      expect(epilepsy).toBe(1);
    });

    it('18. task facets count multiple tasks per dataset', () => {
      const pool = [
        makeDataset({ keywords: ['working memory', 'resting state'] }),
        makeDataset({ tasks: ['working memory'] }),
      ];
      const facets = computeFacets(pool, {});
      const wm = facets.task?.find((f) => f.value.toLowerCase() === 'working memory')?.count;
      const rs = facets.task?.find((f) => f.value.toLowerCase() === 'resting state')?.count;
      expect(wm).toBe(2);
      expect(rs).toBe(1);
    });
  });

  // ─── Filter Matching (19-22) ───────────────────────────────────────────────

  describe('Filter Matching Semantics', () => {
    const multiDs = makeDataset({
      modality: ['mri'],
      disease: ['parkinson', 'healthy'],
    });

    it("19. Disease A (Parkinson's) matches multi-disease dataset", () => {
      expect(matchesFilter(multiDs, 'disease', "Parkinson's")).toBe(true);
    });

    it('20. Disease B (Healthy) matches same multi-disease dataset', () => {
      expect(matchesFilter(multiDs, 'disease', 'Healthy')).toBe(true);
    });

    it('21. OR within Disease dimension', () => {
      const dsParkinson = makeDataset({ disease: 'parkinson' });
      const dsAlzheimer = makeDataset({ disease: 'alzheimer' });
      const dsHealthy = makeDataset({ disease: 'healthy' });

      const pool = [dsParkinson, dsAlzheimer, dsHealthy];
      const filtered = applyFilters(pool, { disease: ["Parkinson's", "Alzheimer's"] });
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain(dsParkinson);
      expect(filtered).toContain(dsAlzheimer);
      expect(filtered).not.toContain(dsHealthy);
    });

    it('22. AND across dimensions (Modality MRI AND Disease Parkinson)', () => {
      const dsMatch = makeDataset({ modality: ['mri'], disease: ['parkinson', 'healthy'] });
      const dsWrongModality = makeDataset({ modality: ['eeg'], disease: ['parkinson'] });
      const dsWrongDisease = makeDataset({ modality: ['mri'], disease: ['alzheimer'] });

      const pool = [dsMatch, dsWrongModality, dsWrongDisease];
      const filtered = applyFilters(pool, {
        modality: ['MRI'],
        disease: ["Parkinson's"],
      });
      expect(filtered).toEqual([dsMatch]);
    });
  });

  // ─── Ranking & Pagination Integrity (23-25) ────────────────────────────────

  describe('Ranking and Pagination Invariants', () => {
    it('23. Ranking score calculation is not mutated by classifier format', () => {
      // Frontend classification does not alter dataset object ranking properties
      const ds = makeDataset({ disease: ['parkinson', 'healthy'], _rankingScore: 0.95 });
      const mappedSources = dimensionFieldSources(ds, 'disease');
      expect(mappedSources).toEqual(["Parkinson's", 'Healthy']);
      expect(ds._rankingScore).toBe(0.95);
    });

    it('24. Filtered candidate order strictly preserves ranking score order', () => {
      const ds1 = makeDataset({ _id: 'd1', disease: ['parkinson', 'healthy'], _rankingScore: 0.95 });
      const ds2 = makeDataset({ _id: 'd2', disease: ['parkinson'], _rankingScore: 0.85 });
      const ds3 = makeDataset({ _id: 'd3', disease: ['parkinson', 'alzheimer'], _rankingScore: 0.75 });

      const rankedPool = [ds1, ds2, ds3]; // Pre-sorted by backend ranking
      const filtered = applyFilters(rankedPool, { disease: ["Parkinson's"] });
      expect(filtered.map((d) => d._id)).toEqual(['d1', 'd2', 'd3']);
    });

    it('25. Pagination maintains natural ranked order across pages', () => {
      const pool = Array.from({ length: 25 }, (_, i) =>
        makeDataset({
          _id: `ds-${i}`,
          disease: i % 2 === 0 ? ['parkinson', 'healthy'] : ['alzheimer'],
          _rankingScore: 1 - i * 0.02,
        })
      );

      const filtered = applyFilters(pool, { disease: ["Parkinson's"] });
      expect(filtered).toHaveLength(13); // indices 0, 2, 4, ..., 24

      const page1 = filtered.slice(0, PAGE_SIZE);
      const page2 = filtered.slice(PAGE_SIZE, PAGE_SIZE * 2);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(3);
      expect(page1[0]._id).toBe('ds-0');
      expect(page1[9]._id).toBe('ds-18');
      expect(page2[0]._id).toBe('ds-20');
      expect(page2[2]._id).toBe('ds-24');
    });
  });
});
