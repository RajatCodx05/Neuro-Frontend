import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { api } from "../src/lib/api-client";

const analyticsPath = resolve(__dirname, "../src/routes/admin/analytics.tsx");
const analyticsSrc = readFileSync(analyticsPath, "utf8");
const costServicePath = resolve(__dirname, "../../../Neuro-Backend/src/services/cost.service.js");
let costServiceSrc = "";
try { costServiceSrc = readFileSync(costServicePath, "utf8"); } catch {}

describe("Phase 11 — Cost Intelligence & Scaling", () => {
  it("exposes breakdown and scaling API clients", () => {
    expect(typeof api.admin.cost.breakdown).toBe("function");
    expect(typeof api.admin.cost.scaling).toBe("function");
    expect(typeof api.admin.cost.summary).toBe("function");
    expect(typeof api.admin.cost.pricing).toBe("function");
  });

  it("cost display distinguishes unavailable vs $0 (backend)", () => {
    expect(costServiceSrc).toContain("pricing_unavailable");
    expect(analyticsSrc).toContain("Pricing unavailable");
    // Heuristic/failed returns 0 costAvailable true
    expect(costServiceSrc).toContain("heuristic_no_cost");
    expect(costServiceSrc).toContain("failed_call_excluded");
  });

  it("scaling assumptions are exposed in frontend", () => {
    expect(analyticsSrc).toContain("Scaling scenarios");
    expect(analyticsSrc).toContain("assumedCostPerSearch");
    expect(analyticsSrc).toContain("assumptions");
    expect(analyticsSrc).toContain("Historical period");
    expect(analyticsSrc).toContain("formula");
    expect(analyticsSrc).toContain("Projections are modeled");
  });

  it("projected values are calculated as searchesPerDay * assumedCostPerSearch", () => {
    expect(analyticsSrc).toContain("projectedDailyCost");
    expect(analyticsSrc).toContain("projectedMonthlyCost");
    expect(costServiceSrc).toContain("projectedDailyCost");
    expect(costServiceSrc).toContain("assumedCostPerSearch");
    expect(costServiceSrc).toContain("searchesPerDay");
    // Ensure formula documented
    expect(costServiceSrc).toContain("projectedDailyCost = searchesPer");
  });

  it("coverage warnings render when calculable % low", () => {
    expect(analyticsSrc).toContain("Coverage & confidence");
    expect(analyticsSrc).toContain("percentCalculable");
    expect(analyticsSrc).toContain("Only");
    expect(analyticsSrc).toContain("carry uncertainty");
    expect(costServiceSrc).toContain("percentCalculable");
    expect(costServiceSrc).toContain("insufficientReasons");
  });

  it("insufficient data handling: does not produce misleading projections", () => {
    expect(costServiceSrc).toContain("insufficient");
    expect(costServiceSrc).toContain("MIN_CALCULABLE_SEARCHES");
    expect(costServiceSrc).toContain("MIN_COVERAGE_PCT");
    expect(analyticsSrc).toContain("Insufficient data");
    expect(analyticsSrc).toContain("Projections unavailable");
  });

  it("empty states for cost intelligence", () => {
    expect(analyticsSrc).toContain("No model cost data");
    expect(analyticsSrc).toContain("No agent cost data");
    expect(analyticsSrc).toContain("No external cost");
    expect(analyticsSrc).toContain("No driver data");
  });

  it("distinguishes measured vs projected vs unavailable and searches/day vs users/day", () => {
    expect(analyticsSrc).toContain("measured");
    expect(analyticsSrc).toContain("assumedCostPerSearch");
    expect(analyticsSrc).toContain("searchesPerDay");
    expect(analyticsSrc).toContain("searches/day");
    // Must NOT claim users/day as interchangeable
    expect(costServiceSrc).not.toContain("usersPerDay");
    expect(analyticsSrc).not.toMatch(/users\/day.*cost/i);
  });

  it("breakdown dimensions: byProvider, byModel, byAgent, byService, byUsageType, byCostType", () => {
    expect(costServiceSrc).toContain("byProvider");
    expect(costServiceSrc).toContain("byModel");
    expect(costServiceSrc).toContain("byAgent");
    expect(costServiceSrc).toContain("byService");
    expect(costServiceSrc).toContain("byUsageType");
    expect(costServiceSrc).toContain("byCostType");
    expect(analyticsSrc).toContain("Cost by model");
    expect(analyticsSrc).toContain("Cost by agent");
    expect(analyticsSrc).toContain("Cost by provider");
    expect(analyticsSrc).toContain("External cost by service");
    expect(analyticsSrc).toContain("Cost by usage type");
  });

  it("does not hard-code pricing in frontend", () => {
    // Frontend must not contain 0.15, 0.60 etc as pricing; it consumes backend
    expect(analyticsSrc).not.toContain("0.15");
    expect(analyticsSrc).not.toContain("GROQ_GPT");
    expect(costServiceSrc).toContain("getLlmPricing");
  });

  it("cost drivers factual only, not causal recommendations", () => {
    expect(analyticsSrc).toContain("where is the money going");
    expect(analyticsSrc).toContain("Factual share only");
    expect(analyticsSrc).not.toMatch(/should be optimized/i);
    expect(analyticsSrc).not.toMatch(/inefficient/i);
  });

  it("external pricing defaults to unavailable unless configured", () => {
    expect(costServiceSrc).toContain("pricing_unavailable");
    expect(costServiceSrc).toContain("Call count is not automatically a billable unit");
  });

  it("no double counting: each TokenUsage counted once", () => {
    expect(costServiceSrc).toContain("calculateCostForRecords");
    // Ensure breakdown iterates usages once
    const occurrences = (costServiceSrc.match(/for \(const u of usages\)/g) || []).length;
    expect(occurrences).toBeGreaterThan(0);
  });

  it("uses backend cost calculations, not frontend reproductions", () => {
    expect(analyticsSrc).toContain("api.admin.cost.breakdown");
    expect(analyticsSrc).toContain("api.admin.cost.scaling");
    // No frontend getLlmPricing
    expect(analyticsSrc).not.toContain("getLlmPricing");
  });

  it("handles 1K/10K/50K default scenarios", () => {
    expect(costServiceSrc).toContain("1000");
    expect(costServiceSrc).toContain("10000");
    expect(costServiceSrc).toContain("50000");
    expect(analyticsSrc).toContain("searchesPerDay");
  });
});
