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
  matchesFilter,
  normalizeDimensions,
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
