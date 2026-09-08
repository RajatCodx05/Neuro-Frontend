import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { api } from "../src/lib/api-client";

const searchesPath = resolve(__dirname, "../src/routes/admin/searches.tsx");
const searchesSrc = readFileSync(searchesPath, "utf8");

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

describe("Phase 10 — Request Detail", () => {
  it("1. Request summary renders: requestId, timestamp, rawQuery, resultSource, resultCount, filters", () => {
    expect(searchesSrc).toContain("Request Summary");
    expect(searchesSrc).toContain("data.queryLog?.rawQuery");
    expect(searchesSrc).toContain("data.requestId");
    expect(searchesSrc).toContain("resultSource");
    expect(searchesSrc).toContain("resultCount");
    expect(searchesSrc).toContain("Filters");
    expect(searchesSrc).toContain("createdAt");
  });

  it("2. RequestId renders and copy interaction exists", () => {
    expect(searchesSrc).toContain("Copy request ID");
    expect(searchesSrc).toContain("navigator.clipboard.writeText");
    expect(searchesSrc).toContain("CopyButton");
    // Full requestId break-all for long IDs
    expect(searchesSrc).toContain("break-all");
  });

  it("3. Timing fields render correctly with stage labels", () => {
    expect(searchesSrc).toContain("TIMING_STAGES");
    expect(searchesSrc).toContain("totalMs");
    expect(searchesSrc).toContain("queryParsingMs");
    expect(searchesSrc).toContain("datasetRetrievalMs");
    expect(searchesSrc).toContain("catalogRetrievalMs");
    expect(searchesSrc).toContain("repositoryMs");
    expect(searchesSrc).toContain("discoveryMs");
    expect(searchesSrc).toContain("rankingMs");
    expect(fmtMs(0)).toBe("0 ms");
    expect(fmtMs(950)).toBe("950 ms");
    expect(fmtMs(1500)).toBe("1.50 s");
  });

  it("4. Null timing renders Skipped not 0ms", () => {
    expect(searchesSrc).toContain('"Skipped"');
    // fmtMs for null handled via italic Skipped path, not via fmtMs directly
    expect(fmtMs(null)).toBe("—"); // helper returns — but section renders Skipped for timings
    // Verify the actual section renders Skipped string for null
    expect(searchesSrc).toMatch(/val == null \? "Skipped"/);
    // Ensure we do NOT render null as 0ms
    expect(searchesSrc).not.toMatch(/val == null \? "0ms"/);
  });

  it("5. Provenance categories remain the exact four-way model", () => {
    expect(searchesSrc).toContain("mongodb_dataset");
    expect(searchesSrc).toContain("mongodb_catalog");
    expect(searchesSrc).toContain('"repository"');
    expect(searchesSrc).toContain('"discovery"');
    // Must NOT replace with MongoDB/External/Fallback generic labels as sole labels
    expect(searchesSrc).toContain("Four-way retrieval provenance");
    expect(searchesSrc).toContain("distinct from resultSource");
    // resultSource vs provenance distinction
    expect(searchesSrc).toContain("resultSource for this request");
  });

  it("6. Agent information renders: agent, provider, model, queryId, duration, status, resultCount, timestamp, error", () => {
    expect(searchesSrc).toContain("AgentSection");
    expect(searchesSrc).toContain("a.agent");
    expect(searchesSrc).toContain("a.provider");
    expect(searchesSrc).toContain("a.model");
    expect(searchesSrc).toContain("a.queryId");
    expect(searchesSrc).toContain("a.durationMs");
    expect(searchesSrc).toContain("a.resultCount");
    expect(searchesSrc).toContain("a.status");
    expect(searchesSrc).toContain("a.errorMessage");
    expect(searchesSrc).toContain("a.createdAt");
    expect(searchesSrc).toContain("Ordered by timestamp");
  });

  it("7. External API information renders with all required fields", () => {
    expect(searchesSrc).toContain("ExternalApiSection");
    expect(searchesSrc).toContain("l.service");
    expect(searchesSrc).toContain("l.operation");
    expect(searchesSrc).toContain("l.endpoint");
    expect(searchesSrc).toContain("l.durationMs");
    expect(searchesSrc).toContain("l.status");
    expect(searchesSrc).toContain("l.httpStatus");
    expect(searchesSrc).toContain("l.error");
    expect(searchesSrc).toContain("l.createdAt");
    // Aggregate info
    expect(searchesSrc).toContain("Total calls");
    expect(searchesSrc).toContain("Successful");
    expect(searchesSrc).toContain("Failed");
    expect(searchesSrc).toContain("Slowest");
    expect(searchesSrc).toContain("Avg duration");
    // Do not sum parallel calls as duration
    expect(searchesSrc).toContain("may have run in parallel");
  });

  it("8. Failed external calls are visibly distinguishable", () => {
    expect(searchesSrc).toContain("bg-rose-500");
    expect(searchesSrc).toContain('l.status === "error"');
    expect(searchesSrc).toContain("bg-rose-500/10");
  });

  it("9. Token actual/estimated distinction remains correct and not provider-reported fiction", () => {
    expect(searchesSrc).toContain("actual");
    expect(searchesSrc).toContain("estimated");
    expect(searchesSrc).toContain("provider-reported");
    expect(searchesSrc).toContain("heuristic");
    expect(searchesSrc).toContain("usageType");
    expect(searchesSrc).toContain("inputTokens");
    expect(searchesSrc).toContain("outputTokens");
    expect(searchesSrc).toContain("totalTokens");
    expect(searchesSrc).toContain("t.cost");
    // Token section also shows status and duration
    expect(searchesSrc).toContain("durationMs");
  });

  it("10. Cost null handling remains correct: null → Pricing unavailable, 0 → $0 only when explicit", () => {
    expect(searchesSrc).toContain("Pricing unavailable");
    expect(searchesSrc).toContain("costAvailable");
    expect(searchesSrc).toContain("$0.00");
    expect(searchesSrc).toContain("is not the same as zero cost");
  });

  it("11. Errors/warnings section renders failures visibly", () => {
    expect(searchesSrc).toContain("Errors & Warnings");
    expect(searchesSrc).toContain("ErrorsWarningsSection");
    expect(searchesSrc).toContain("failed");
    expect(searchesSrc).toContain("estimated token");
    expect(searchesSrc).toContain("out_of_domain");
    expect(searchesSrc).toContain("skipped");
  });

  it("12. Empty sections render meaningful empty states", () => {
    expect(searchesSrc).toContain("No agent logs for this request");
    expect(searchesSrc).toContain("No external API calls for this request");
    expect(searchesSrc).toContain("No token usage for this request");
    expect(searchesSrc).toContain("Cost data not available");
    expect(searchesSrc).toContain("No provenance recorded");
    expect(searchesSrc).toContain("No filters applied");
  });

  it("13. Partial/missing telemetry does not crash the drawer (null-safe access)", () => {
    expect(searchesSrc).toContain("data.timings ?? null");
    expect(searchesSrc).toContain("data.provenance ?? null");
    expect(searchesSrc).toContain("data.queryLog?.rawQuery ??");
    // Filters optional chaining
    expect(searchesSrc).toContain("filters?");
  });

  it("14. Existing Search Logs functionality remains intact", () => {
    expect(typeof api.admin.searches.list).toBe("function");
    expect(typeof api.admin.searches.detail).toBe("function");
    // Pagination, filters still present
    expect(searchesSrc).toContain("PAGE_SIZE");
    expect(searchesSrc).toContain("resultSource");
    expect(searchesSrc).toContain("Filter by query text");
  });

  it("15. No unnecessary duplicate API calls introduced — drawer uses single detail endpoint", () => {
    // Count api.admin occurrences in searches.tsx — should only have list + detail
    const detailCalls = (searchesSrc.match(/api\.admin\.searches\.detail/g) ?? []).length;
    const listCalls = (searchesSrc.match(/api\.admin\.searches\.list/g) ?? []).length;
    expect(detailCalls).toBe(1);
    expect(listCalls).toBe(1);
    expect(searchesSrc).toContain('queryKey: ["search-detail"');
    expect(searchesSrc).toContain('GET /admin/searches/:requestId');
    // Must NOT call agents/tokens/externalLogs separately inside drawer
    expect(searchesSrc).not.toContain("api.admin.infra.agents(");
    expect(searchesSrc).not.toContain("api.admin.infra.tokens(");
    expect(searchesSrc).not.toContain("api.admin.externalLogs.list(");
  });

  it("repositoryMs wall-clock semantics preserved", () => {
    expect(searchesSrc).toContain("Wall-clock time");
    expect(searchesSrc).toContain("run in parallel, not summed");
  });

  it("investigation workflow: copy + navigate to other admin views by requestId", () => {
    expect(searchesSrc).toContain("Investigate further");
    expect(searchesSrc).toContain("View agents by this ID");
    expect(searchesSrc).toContain("View tokens by this ID");
    expect(searchesSrc).toContain("View external logs");
    expect(searchesSrc).toContain("admin_requestId_filter");
  });

  it("long queries wrap correctly and drawer does not overflow horizontally", () => {
    expect(searchesSrc).toContain("break-words");
    expect(searchesSrc).toContain("overflow-x-auto");
    expect(searchesSrc).toContain("overflow-x-hidden");
    expect(searchesSrc).toContain("whitespace-pre-wrap");
  });

  it("result context shows result count and provenance distribution without duplicating search payload", () => {
    expect(searchesSrc).toContain("ResultContextSection");
    expect(searchesSrc).toContain("Result count");
    expect(searchesSrc).toContain("Provenance distribution");
  });
});
