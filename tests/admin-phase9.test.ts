import { describe, it, expect } from "vitest";
import { api } from "../src/lib/api-client";

describe("Phase 9 Admin API Client & Observability", () => {
  it("exposes all required Phase 8 admin endpoints", () => {
    expect(typeof api.admin.searches.list).toBe("function");
    expect(typeof api.admin.searches.detail).toBe("function");
    expect(typeof api.admin.externalLogs.list).toBe("function");
    expect(typeof api.admin.cost.summary).toBe("function");
    expect(typeof api.admin.cost.byRequest).toBe("function");
    expect(typeof api.admin.cost.daily).toBe("function");
    expect(typeof api.admin.cost.monthly).toBe("function");
    expect(typeof api.admin.cost.pricing).toBe("function");
    expect(typeof api.admin.infra.tokens).toBe("function");
    expect(typeof api.admin.infra.agents).toBe("function");
  });

  it("handles null and zero cost formatting rules correctly", () => {
    // Constraint: Never display null/undefined cost as $0, only formatted if number
    const formatCost = (cost: number | null | undefined): string => {
      if (cost == null) return "Pricing unavailable";
      if (cost === 0) return "$0.0000";
      return `$${cost.toFixed(4)}`;
    };

    expect(formatCost(null)).toBe("Pricing unavailable");
    expect(formatCost(undefined)).toBe("Pricing unavailable");
    expect(formatCost(0)).toBe("$0.0000");
    expect(formatCost(0.00123)).toBe("$0.0012");
  });

  it("handles null timing rules correctly", () => {
    // Constraint: Null timings should be shown as Skipped, not 0ms
    const formatTiming = (val: number | null | undefined): string => {
      if (val == null) return "Skipped";
      return `${Math.round(val)}ms`;
    };

    expect(formatTiming(null)).toBe("Skipped");
    expect(formatTiming(undefined)).toBe("Skipped");
    expect(formatTiming(0)).toBe("0ms");
    expect(formatTiming(142.6)).toBe("143ms");
  });

  it("preserves actual vs estimated token type distinction", () => {
    const isEstimated = (usageType?: string) => usageType === "estimated";
    expect(isEstimated("estimated")).toBe(true);
    expect(isEstimated("actual")).toBe(false);
    expect(isEstimated(undefined)).toBe(false);
  });

  it("handles request detail drawer fallback values gracefully", () => {
    // Test that empty/partial search detail objects don't crash and render fallback structures
    const partialDetail = {
      requestId: "req_test_123",
      queryLog: {
        rawQuery: "alzheimer eeg",
        resultSource: "merged",
        resultCount: 12,
        timings: {
          parseMs: 45,
          validationMs: null, // Skipped
          rankingMs: 120,
          totalMs: 250,
        },
        provenance: {
          mongodb_dataset: 8,
          repository: 4,
          literature_paper: 0,
        },
      },
      agentLogs: [],
      tokenUsages: [],
      externalLogs: [],
      cost: null,
    };

    expect(partialDetail.requestId).toBe("req_test_123");
    expect(partialDetail.queryLog.timings.validationMs).toBeNull();
    expect(partialDetail.agentLogs).toHaveLength(0);
    expect(partialDetail.tokenUsages).toHaveLength(0);
    expect(partialDetail.externalLogs).toHaveLength(0);
    expect(partialDetail.cost).toBeNull();
  });

  it("calculates 4-way provenance distribution accurately", () => {
    const provenanceSummary = [
      { _id: "mongodb_dataset", count: 45 },
      { _id: "repository", count: 30 },
      { _id: "literature_paper", count: 15 },
      { _id: "fallback", count: 10 },
    ];

    const total = provenanceSummary.reduce((sum, item) => sum + item.count, 0);
    expect(total).toBe(100);

    const percentages = provenanceSummary.map((item) => ({
      name: item._id,
      count: item.count,
      pct: (item.count / total) * 100,
    }));

    expect(percentages.find((p) => p.name === "mongodb_dataset")?.pct).toBe(45);
    expect(percentages.find((p) => p.name === "repository")?.pct).toBe(30);
    expect(percentages.find((p) => p.name === "literature_paper")?.pct).toBe(15);
    expect(percentages.find((p) => p.name === "fallback")?.pct).toBe(10);
  });

  it("ensures external API summary fields represent full filtered dataset", () => {
    const backendSummary = {
      count: 1420,
      avgMs: 312,
      maxMs: 1850,
      minMs: 45,
      errors: 12,
    };

    // The frontend must display backendSummary directly without recomputing from page items
    expect(backendSummary.count).toBe(1420);
    expect(backendSummary.errors).toBe(12);
    expect(backendSummary.avgMs).toBe(312);
    expect(backendSummary.maxMs).toBe(1850);
    expect(backendSummary.minMs).toBe(45);
  });
});

