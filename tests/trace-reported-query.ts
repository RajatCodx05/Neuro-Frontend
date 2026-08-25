/**
 * End-to-end trace of the reported bug scenario using the REAL frontend code
 * paths (normalizeDimensions + valuesOverlap, the exact chain used by
 * search-state.tsx's FR-7 conflict detection). Run: npx tsx (or vitest) —
 * executed via `npx vite-node` equivalent; kept as a script for the audit.
 */
import { normalizeDimensions, valuesOverlap } from "../src/lib/search-filters";

function conflict(intentRaw: Record<string, unknown>, selection: Record<string, string[]>) {
  const intent = normalizeDimensions(intentRaw); // what applySearchResponse stores as parsedIntent
  for (const [dim, values] of Object.entries(selection)) {
    const d = dim as Parameters<typeof valuesOverlap>[0];
    if (values.length && intent[d]?.length && !valuesOverlap(d, values, intent[d])) {
      return { dimension: d, values };
    }
  }
  return null;
}

const scenarios: Array<[string, Record<string, unknown>, Record<string, string[]>]> = [
  [
    'Reported query "…children…" (new canonical intent "child") + Child filter',
    { modality: ["fMRI"], condition: ["ADHD"], age_range: "child" },
    { ageGroup: ["Child"] },
  ],
  [
    'Reported query with LEGACY cached intent "pediatric" + Child filter',
    { age_range: "pediatric" },
    { ageGroup: ["Child"] },
  ],
  ['"…children…" + Adult filter', { age_range: "child" }, { ageGroup: ["Adult"] }],
  ['"…adults…" + Adult filter', { age_range: "adult" }, { ageGroup: ["Adult"] }],
  ['"…adults…" + Child filter', { age_range: "adult" }, { ageGroup: ["Child"] }],
  ['"…adolescents…" + Adolescent filter', { age_range: "adolescent" }, { ageGroup: ["Adolescent"] }],
  ['"…adolescents…" + Adult filter', { age_range: "adolescent" }, { ageGroup: ["Adult"] }],
];

for (const [label, intent, selection] of scenarios) {
  console.log(`${conflict(intent, selection) ? "CONFLICT   " : "NO CONFLICT"} | ${label}`);
}
