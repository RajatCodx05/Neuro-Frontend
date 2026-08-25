/**
 * Regression tests for canonical age-group vocabulary alignment (FR-7 fix).
 *
 * Bug: query understanding emitted `age_range: "pediatric"` while the Age
 * Group facet exposes the dataset-metadata label "Child"; lexical conflict
 * detection (`valuesOverlap`) flagged them as disjoint and showed a false
 * conflict warning. Fix: one canonical vocabulary mirroring AGE_TERMS
 * (Neuro-Agents/app/data/vocab.py), applied to parser intent AND facets AND
 * conflict matching via AGE_GROUP_CANONICAL_TOKENS / ageGroupOverlap.
 */
import { describe, expect, it } from "vitest";

import {
  applyFilters,
  computeFacets,
  matchesFilter,
  normalizeDimensions,
  parseUrlFilters,
  serializeFiltersKey,
  valuePairMatches,
  valuesOverlap,
} from "../src/lib/search-filters";

/** Same predicate chain search-state.tsx uses for FR-7 conflict detection. */
function conflictsWithIntent(
  intentRaw: Record<string, unknown>,
  selection: Record<string, string[]>,
): boolean {
  const intent = normalizeDimensions(intentRaw);
  return Object.entries(selection).some(([dimension, values]) => {
    const d = dimension as Parameters<typeof valuesOverlap>[0];
    return Boolean(values.length && intent[d]?.length && !valuesOverlap(d, values, intent[d]));
  });
}

describe("canonical age-group vocabulary", () => {
  it.each([
    ["children", "child"],
    ["child", "child"],
    ["kids", "child"],
    ["kid", "child"],
    ["pediatric", "child"],
    ["adults", "adult"],
    ["adult", "adult"],
    ["adolescents", "adolescent"],
    ["adolescent", "adolescent"],
    ["teenagers", "adolescent"],
    ["teenager", "adolescent"],
    ["youth", "adolescent"],
    ["geriatric", "elderly"],
    ["older adults", "elderly"],
    ["infants", "infant"],
  ])("normalizes %s → %s", (raw, canonical) => {
    expect(normalizeDimensions({ age_range: raw })).toEqual({ ageGroup: [canonical] });
  });

  it("preserves numeric age ranges untouched", () => {
    expect(normalizeDimensions({ age_range: "8-12" })).toEqual({ ageGroup: ["8-12"] });
  });

  it("maps the age_range key onto the ageGroup dimension", () => {
    expect(normalizeDimensions({ age_range: null })).toEqual({});
    expect(normalizeDimensions({})).toEqual({});
  });
});

describe("conflict behavior (FR-7)", () => {
  it("reported bug: children query + Child filter → NO conflict", () => {
    expect(
      conflictsWithIntent(
        { modality: ["fMRI"], condition: ["ADHD"], age_range: "child" },
        { ageGroup: ["Child"] },
      ),
    ).toBe(false);
  });

  it("legacy cached parses emitting pediatric + Child filter → NO conflict", () => {
    expect(conflictsWithIntent({ age_range: "pediatric" }, { ageGroup: ["Child"] })).toBe(false);
  });

  it.each([
    ["child", "Child", false],
    ["child", "Adult", true],
    ["adult", "Adult", false],
    ["adults", "Adult", false],
    ["adult", "Child", true],
    ["adolescent", "Adolescent", false],
    ["adolescents", "Adolescent", false],
    ["adolescent", "Adult", true],
  ])("intent %s vs filter %s → conflict=%s", (intent, filter, expected) => {
    expect(conflictsWithIntent({ age_range: intent }, { ageGroup: [filter] })).toBe(expected);
  });

  it("distinct concepts never collapse: children ≠ adolescent ≠ adult", () => {
    expect(valuesOverlap("ageGroup", ["children"], ["Adolescent"])).toBe(false);
    expect(valuesOverlap("ageGroup", ["teenagers"], ["Child"])).toBe(false);
    expect(valuesOverlap("ageGroup", ["adolescent"], ["Adult"])).toBe(false);
  });
});

describe("existing normalization/conflict behavior unchanged (regression)", () => {
  it("modality synonyms still overlap", () => {
    expect(valuesOverlap("modality", ["fMRI"], ["MRI"])).toBe(true);
    expect(valuesOverlap("modality", ["functional magnetic resonance imaging"], ["fMRI"])).toBe(
      true,
    );
    expect(valuesOverlap("modality", ["EEG"], ["fMRI"])).toBe(false);
  });

  it("disease canonicalization still collapses variants", () => {
    expect(normalizeDimensions({ condition: ["Alzheimer's disease"] })).toEqual({
      disease: ["alzheimer"],
    });
    expect(valuesOverlap("disease", ["Alzheimer's"], ["Alzheimer"])).toBe(true);
  });

  it("non-age dimensions are unaffected by the age token map", () => {
    expect(valuePairMatches("species", "human", "human")).toBe(true);
    expect(valuePairMatches("species", "mouse", "human")).toBe(false);
  });

  it("facet matching treats pediatric metadata as Child", () => {
    // Real enriched metadata carries AGE_TERMS tokens/labels, never prose.
    for (const age of ["pediatric", "children", "child"]) {
      expect(
        matchesFilter({ age_group: age } as Record<string, unknown>, "ageGroup", "Child"),
      ).toBe(true);
    }
  });

  it("numeric range does not match categorical labels", () => {
    expect(valuePairMatches("ageGroup", "8-12", "child")).toBe(false);
    expect(valuePairMatches("ageGroup", "8-12", "8–12")).toBe(true); // en-dash variant
  });
});

describe("static Age Group facet options (counts stay dynamic)", () => {
  const EXPECTED = [
    { value: "Adolescent", count: 0 },
    { value: "Adult", count: 0 },
    { value: "Child", count: 0 },
    { value: "Elderly", count: 0 },
    { value: "Infant", count: 0 },
  ];

  // Test 1 � result set containing only Child still shows all five options.
  it("child-only pool still renders all five options, alphabetically", () => {
    const facets = computeFacets([{ age_group: "child" }], {});
    expect(facets.ageGroup?.map((f) => f.value)).toEqual([
      "Adolescent",
      "Adult",
      "Child",
      "Elderly",
      "Infant",
    ]);
    expect(facets.ageGroup?.find((f) => f.value === "Child")?.count).toBe(1);
  });

  // Test 2 � different query/result set: still all five options.
  it("adult/elderly/infant pool still renders all five options", () => {
    const pool = [{ age_group: "adult" }, { age_group: "elderly" }, { age_range: "infants" }];
    const values = computeFacets(pool, {}).ageGroup?.map((f) => f.value);
    expect(values).toEqual(["Adolescent", "Adult", "Child", "Elderly", "Infant"]);
  });

  // Test 3 � missing categories get count 0 and stay visible.
  it("missing categories receive count 0 and remain visible", () => {
    const facets = computeFacets([{ age_group: "child" }], {}).ageGroup ?? [];
    for (const expected of EXPECTED) {
      const option = facets.find((f) => f.value === expected.value);
      expect(option, `${expected.value} must be present`).toBeDefined();
      if (expected.value === "Child") expect(option?.count).toBe(1);
      else expect(option?.count).toBe(0);
    }
  });

  // Test 4 � exact alphabetical order.
  it("orders exactly Adolescent, Adult, Child, Elderly, Infant", () => {
    const mixed = [
      { age_group: "infant" },
      { age_group: "adolescents" },
      { age_group: "elderly" },
      { age_group: "adults" },
      { age_group: "children" },
    ];
    expect(computeFacets(mixed, {}).ageGroup?.map((f) => f.value)).toEqual([
      "Adolescent",
      "Adult",
      "Child",
      "Elderly",
      "Infant",
    ]);
  });

  // Test 5 + 6 � counts are dynamic; options/order are not.
  it("merges dynamic counts onto the static alphabetical options", () => {
    const poolA = [
      { age_group: "adolescent" },
      { age_group: "adolescent" },
      { age_group: "adults" },
      { age_group: "adults" },
      { age_group: "adults" },
      { age_group: "adults" },
      { age_group: "children" },
    ];
    expect(computeFacets(poolA, {}).ageGroup).toEqual([
      { value: "Adolescent", count: 2 },
      { value: "Adult", count: 4 },
      { value: "Child", count: 1 },
      { value: "Elderly", count: 0 },
      { value: "Infant", count: 0 },
    ]);

    const poolB = [
      { age_group: "adolescent" },
      { age_group: "adult" },
      { age_group: "adult" },
      { age_group: "adult" },
      { age_group: "adult" },
      { age_group: "child" },
      { age_group: "child" },
      { age_group: "elderly" },
      { age_group: "elderly" },
      { age_range: "newborns" },
      { age_range: "infant" },
    ];
    expect(computeFacets(poolB, {}).ageGroup).toEqual([
      { value: "Adolescent", count: 1 },
      { value: "Adult", count: 4 },
      { value: "Child", count: 2 },
      { value: "Elderly", count: 2 },
      { value: "Infant", count: 2 },
    ]);
  });

  it("unknown/unexpected age metadata never adds extra options", () => {
    const facets = computeFacets(
      [{ age_group: "pediatric cohort study" }, { age_range: "8-12" }],
      {},
    ).ageGroup?.map((f) => f.value);
    expect(facets).toEqual(["Adolescent", "Adult", "Child", "Elderly", "Infant"]);
  });

  it("empty pool still shows the five zero-count options", () => {
    expect(computeFacets([], {}).ageGroup).toEqual(EXPECTED);
  });

  // Test 7 � selection behavior unchanged: Child selectable, filters pool,
  // survives URL round-trip, stays visible when its own count is 0.
  it("selecting Child behaves exactly as before", () => {
    const pool = [
      { age_group: "child", title: "kids study" },
      { age_group: "adult", title: "grown-ups study" },
    ];
    // Facet click ? matchesFilter via the identical predicate.
    expect(matchesFilter(pool[0] as Record<string, unknown>, "ageGroup", "Child")).toBe(true);
    expect(matchesFilter(pool[1] as Record<string, unknown>, "ageGroup", "Child")).toBe(false);
    expect(
      applyFilters(pool as Array<Record<string, unknown>>, { ageGroup: ["Child"] }),
    ).toHaveLength(1);

    // URL round-trip keeps the same casing/serialization contract as disease.
    const url = new URLSearchParams({ ageGroup: "Child" });
    expect(parseUrlFilters(Object.fromEntries(url))).toEqual({ ageGroup: ["Child"] });
    expect(serializeFiltersKey({ ageGroup: ["Child"] })).toBe(
      serializeFiltersKey(parseUrlFilters(Object.fromEntries(url))),
    );

    // Selected-but-zero-count value remains listed (search.tsx merges `selected`
    // into the rendered options with count 0; computeFacets itself always
    // includes it now thanks to the static vocabulary).
    const filteredPool = applyFilters(pool as Array<Record<string, unknown>>, {
      ageGroup: ["Child"],
    });
    const childOption = computeFacets(filteredPool, { ageGroup: ["Child"] }).ageGroup?.find(
      (f) => f.value === "Child",
    );
    expect(childOption?.count).toBe(1);
  });

  // Test 8 � other dimensions keep their existing dynamic behavior.
  it("does not change modality/disease facet dynamics", () => {
    const eegOnly = computeFacets([{ modality: ["EEG"], disease: "epilepsy" }], {});
    expect(eegOnly.modality?.map((f) => f.value)).toEqual(["eeg"]); // dynamic, not a master list
    const diseaseValues = eegOnly.disease?.map((f) => f.value) ?? [];
    expect(diseaseValues.length).toBeGreaterThan(5); // master list incl. zero counts
    expect(diseaseValues).toContain("Epilepsy");
  });
});
