import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type AdminAnalytics } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Inbox, AlertTriangle, DollarSign, Coins, TrendingUp, Calculator, PieChart as PieIcon, Activity } from "lucide-react";
import { AnalyticsChartCard, AnalyticsChartModal } from "@/components/app/analytics-chart-card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics — NeuroSearch AI" }] }),
  component: AnalyticsPage,
});

type AnalyticsCard = {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  details?: ReactNode;
};

const chartTooltipStyle = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  color: "var(--popover-foreground)",
  borderRadius: 12,
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
};

const formatMs = (ms: number | null | undefined) =>
  ms == null ? "—" : `${Math.round(ms).toLocaleString()} ms`;

const formatPct = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

// ---------- Real-statistics building blocks (only backend data below) ----------

function StatRow({
  label,
  value,
  unavailable,
  hint,
}: {
  label: string;
  value?: ReactNode;
  unavailable?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {hint && (
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground/60">{hint}</div>
        )}
      </div>
      <div className="shrink-0 text-right text-sm font-semibold">
        {unavailable ? (
          <span className="text-xs font-normal italic text-muted-foreground/70">
            Metric unavailable
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4">
      <Inbox className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
        No data recorded yet
      </span>
      <span className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground/50">
        {label}
      </span>
    </div>
  );
}

// ---------- Widget 2 · Repository usage distribution ----------

function RepositoryUsageDetails({ data }: { data: AdminAnalytics }) {
  const repos = data.repositories ?? [];
  if (repos.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
        No repository data recorded yet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/40 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Repository</th>
              <th className="px-3 py-2 text-right font-medium">Datasets indexed</th>
              <th className="px-3 py-2 text-right font-medium">Recorded count</th>
              <th className="px-3 py-2 text-right font-medium">Searches (repo filter)</th>
              <th className="px-3 py-2 text-right font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Last sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {repos.map((r) => (
              <tr key={r.source}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.datasetsIndexed.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.datasetCount != null ? r.datasetCount.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.searchesServed.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.syncStatus === "online" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Healthy
                    </span>
                  ) : r.syncStatus === "syncing" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />{" "}
                      Syncing
                    </span>
                  ) : r.syncStatus === "offline" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Offline
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Not tracked</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1">
        <StatRow
          label="Searches served (60 days)"
          value={repos.reduce((a, r) => a + r.searchesServed, 0).toLocaleString()}
        />
        <StatRow
          label="Datasets indexed (all time)"
          value={repos.reduce((a, r) => a + r.datasetsIndexed, 0).toLocaleString()}
        />
        <StatRow
          label="Average response time (per repository)"
          unavailable
          hint="Not persisted — AgentLog.durationMs is recorded per operation but not attributed to a repository source."
        />
        <StatRow
          label="Success / failure rate (per repository)"
          unavailable
          hint="Not persisted — no per-repository success/failure counters exist in the backend."
        />
        <StatRow
          label="Average datasets per search (per repository)"
          unavailable
          hint="Not persisted — QueryLog.resultCount is stored per search, not broken down by repository."
        />
      </div>
    </div>
  );
}

// ---------- Widget 3 · Search performance ----------

function SearchPerformanceDetails({ data }: { data: AdminAnalytics }) {
  const perf = data.searchPerformance;
  const overall = perf?.overall;
  const stages = perf?.stages ?? {};
  const persistedStages = [
    { key: "queryParser", label: "Query Parser (parse_query)" },
    { key: "repositorySearch", label: "Repository Search (repository_search)" },
    { key: "webDiscovery", label: "Web Discovery (fallback)" },
  ];
  const missingStages = [
    { key: "mongoSearch", label: "Mongo Search" },
    { key: "metadataEnrichment", label: "Metadata Enrichment" },
    { key: "verification", label: "Verification" },
    { key: "ranking", label: "Ranking" },
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Durations (60 days)
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
          <div className="mb-2 text-[11px] leading-snug text-muted-foreground/70">
            Real durations persisted by the backend for search operations (query parse, repository
            search, web discovery). Full request latency and local Mongo/ranking time are not
            persisted.
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <StatRow label="Average" value={formatMs(overall?.avgMs)} />
            <StatRow label="Median" value={formatMs(overall?.medianMs)} />
            <StatRow label="Minimum" value={formatMs(overall?.minMs)} />
            <StatRow label="Maximum" value={formatMs(overall?.maxMs)} />
            <StatRow label="95th percentile" value={formatMs(overall?.p95Ms)} />
            <StatRow
              label="Operations measured"
              value={overall?.totalOps?.toLocaleString() ?? "—"}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Average execution time by stage
        </div>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {persistedStages.map(({ key, label }) => {
            const s = stages[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-2.5 text-xs last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums">
                  {s
                    ? `${formatMs(s.avgMs)} · ${s.count.toLocaleString()} ops`
                    : "Metric unavailable"}
                </span>
              </div>
            );
          })}
          {missingStages.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 border-b border-border/50 px-4 py-2.5 text-xs last:border-0"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="italic text-muted-foreground/70">
                Historical stage metrics are not persisted
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Widget 4 · Search outcome distribution ----------

function SearchOutcomeDetails({ data }: { data: AdminAnalytics }) {
  const o = data.searchOutcomes;
  if (!o || o.total === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
        No search outcomes recorded yet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <StatRow label="Total searches (60 days)" value={o.total.toLocaleString()} />
        <StatRow
          label="Average results per search"
          value={o.avgResultsPerSearch?.toLocaleString()}
        />
        <StatRow label="Searches with results" value={o.withResults.toLocaleString()} />
        <StatRow label="Searches with no results" value={o.noResults.toLocaleString()} />
        <StatRow label="Served from cache" value={o.bySource.cache.toLocaleString()} />
        <StatRow
          label="Served from merged orchestrator"
          value={o.bySource.merged.toLocaleString()}
        />
        <StatRow label="Served from fallback agent" value={o.bySource.fallback.toLocaleString()} />
        <StatRow
          label="Partial results"
          unavailable
          hint="The backend has no partial-outcome classification — searches are logged only as with-results or no-results."
        />
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <StatRow
          label="Most common query"
          value={
            o.mostCommonQuery ? `${o.mostCommonQuery.query} (${o.mostCommonQuery.count})` : "—"
          }
        />
        <StatRow
          label="Most common query with no results"
          value={
            o.mostCommonEmptyQuery
              ? `${o.mostCommonEmptyQuery.query} (${o.mostCommonEmptyQuery.count})`
              : "—"
          }
        />
        <StatRow
          label="Failed search operations"
          value={o.failedSearchOperations.toLocaleString()}
          hint="AgentLog entries with status = error (parse, repository search, web discovery)."
        />
        <StatRow label="Top failure reason" value={o.topFailureReason ?? "—"} />
        <StatRow label="Most common failed query" value={o.topFailedQuery ?? "—"} />
        <StatRow
          label="Timed-out searches"
          unavailable
          hint="Search timeouts are not logged as an outcome in QueryLog or AgentLog."
        />
      </div>
    </div>
  );
}

// ---------- Phase 11 — Cost Intelligence Section ----------

function CostIntelligenceSection() {
  const [customScn, setCustomScn] = useState("5000");
  const { data: breakdown, isLoading: bdLoading, isError: bdError } = useQuery({
    queryKey: ["admin-cost-breakdown"],
    queryFn: () => api.admin.cost.breakdown(),
    staleTime: 30_000,
  });
  const { data: scaling, isLoading: scLoading, isError: scError } = useQuery({
    queryKey: ["admin-cost-scaling"],
    queryFn: () => api.admin.cost.scaling(),
    staleTime: 30_000,
  });

  const fmtCost = (v: number | null | undefined) => (v == null ? "Pricing unavailable" : v === 0 ? "$0.00" : `$${v.toFixed(6)}`);
  const fmtUsd = (v: number | null | undefined) => (v == null ? "—" : `$${Number(v).toFixed(4)}`);
  const customNum = parseInt(customScn, 10);
  const customValid = Number.isFinite(customNum) && customNum > 0 && customNum <= 1000000;
  const assumed = scaling?.assumptions.avgCostPerSearch ?? breakdown?.averages.assumedCostPerSearch ?? null;
  const customProjected = customValid && assumed != null ? customNum * assumed : null;

  if (bdLoading && scLoading) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cost intelligence & scaling</h2>
        <div className="glass rounded-2xl p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cost intelligence & scaling</h2>
      <p className="text-xs italic text-muted-foreground/70 -mt-3">Measured historical cost from stored telemetry; projections are modeled, not measured. Pricing from centralized config; external cost only when pricing configured.</p>

      {/* Coverage & confidence */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><PieIcon className="h-4 w-4 text-cyan" /> Coverage & confidence</div>
        {bdError ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-400"><AlertTriangle className="h-3.5 w-3.5" /> Failed to load breakdown.</div>
        ) : breakdown ? (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total searches", value: breakdown.coverage.totalSearches.toLocaleString() },
                { label: "Calculable", value: `${breakdown.coverage.searchesWithCalculableCost.toLocaleString()} (${breakdown.coverage.percentCalculable}%)` },
                { label: "Estimated", value: `${breakdown.coverage.searchesWithEstimatedCost.toLocaleString()} (${breakdown.coverage.percentEstimated}%)` },
                { label: "Unavailable", value: `${breakdown.coverage.searchesWithUnavailableCost.toLocaleString()} (${breakdown.coverage.percentUnavailable}%)` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
                </div>
              ))}
            </div>
            {breakdown.coverage.percentCalculable < 70 && breakdown.coverage.totalSearches > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Only {breakdown.coverage.percentCalculable}% of searches have calculable cost — projections carry uncertainty.
              </div>
            )}
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/40 py-2"><span className="text-muted-foreground">Avg calculable cost/search</span><span className="font-mono">{breakdown.averages.avgCostPerSearch != null ? `$${breakdown.averages.avgCostPerSearch.toFixed(6)}` : "—"}</span></div>
              <div className="flex items-center justify-between border-b border-border/40 py-2"><span className="text-muted-foreground">Avg LLM/search</span><span className="font-mono">{breakdown.averages.avgLlmPerSearch != null ? `$${breakdown.averages.avgLlmPerSearch.toFixed(6)}` : "—"}</span></div>
              <div className="flex items-center justify-between border-b border-border/40 py-2"><span className="text-muted-foreground">Avg external/search</span><span className="font-mono">{breakdown.averages.avgExternalPerSearch != null ? `$${breakdown.averages.avgExternalPerSearch.toFixed(6)}` : "—"}</span></div>
              <div className="flex items-center justify-between border-b border-border/40 py-2"><span className="text-muted-foreground">Overall avg (all searches)</span><span className="font-mono">{breakdown.averages.overallAvgCostPerSearch != null ? `$${breakdown.averages.overallAvgCostPerSearch.toFixed(6)}` : "—"}</span></div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Breakdown: Provider / Model / Agent / Service / UsageType / CostType */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By Model */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><Coins className="h-4 w-4 text-cyan" /> Cost by model</div>
          {bdLoading ? <Skeleton className="mt-3 h-32 w-full rounded-xl" /> : breakdown && breakdown.breakdown.byModel.length > 0 ? (
            <div className="mt-3 space-y-1">
              {breakdown.breakdown.byModel.slice(0, 6).map((m) => (
                <div key={`${m.provider}/${m.model}`} className="flex items-center justify-between text-xs border-b border-border/30 py-1.5">
                  <span className="font-mono truncate pr-2">{m.model} <span className="text-muted-foreground/60">({m.provider})</span></span>
                  <span className="shrink-0 font-mono tabular-nums">${m.llmCost.toFixed(6)} · {m.percentage}%</span>
                </div>
              ))}
              <p className="text-[10px] italic text-muted-foreground/60">LLM cost only; % of total LLM cost. Pricing from config; unavailable pricing shown as 0 in breakdown.</p>
            </div>
          ) : <p className="mt-3 text-xs italic text-muted-foreground">No model cost data.</p>}
        </div>
        {/* By Agent */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-cyan" /> Cost by agent</div>
          {bdLoading ? <Skeleton className="mt-3 h-32 w-full rounded-xl" /> : breakdown && breakdown.breakdown.byAgent.length > 0 ? (
            <div className="mt-3 space-y-1">
              {breakdown.breakdown.byAgent.slice(0, 6).map((a) => (
                <div key={a.agent} className="flex items-center justify-between text-xs border-b border-border/30 py-1.5">
                  <span className="font-mono">{a.agent}</span>
                  <span className="font-mono tabular-nums">${a.llmCost.toFixed(6)} · {a.percentage}%</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-xs italic text-muted-foreground">No agent cost data.</p>}
        </div>
        {/* By Provider */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><DollarSign className="h-4 w-4 text-cyan" /> Cost by provider</div>
          {bdLoading ? <Skeleton className="mt-3 h-24 w-full rounded-xl" /> : breakdown && breakdown.breakdown.byProvider.length > 0 ? (
            <div className="mt-3 space-y-1">
              {breakdown.breakdown.byProvider.map((p) => (
                <div key={p.provider} className="flex items-center justify-between text-xs border-b border-border/30 py-1.5">
                  <span className="font-mono">{p.provider}</span>
                  <span className="font-mono tabular-nums">${p.llmCost.toFixed(6)} · {p.percentage}% · {p.count} calls</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-xs italic text-muted-foreground">No provider cost data.</p>}
        </div>
        {/* By Service (external) */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-cyan" /> External cost by service</div>
          {bdLoading ? <Skeleton className="mt-3 h-24 w-full rounded-xl" /> : breakdown && breakdown.breakdown.byService.length > 0 ? (
            <div className="mt-3 space-y-1">
              {breakdown.breakdown.byService.slice(0, 6).map((s) => (
                <div key={s.service} className="flex items-center justify-between text-xs border-b border-border/30 py-1.5">
                  <span className="font-mono">{s.service} <span className="text-muted-foreground/60">({s.count})</span></span>
                  <span className="font-mono tabular-nums">{s.externalCost > 0 ? `$${s.externalCost.toFixed(6)}` : "Pricing unavailable"} · {s.percentage}%</span>
                </div>
              ))}
              <p className="text-[10px] italic text-muted-foreground/60">Call count ≠ billable unit unless pricing configured (e.g., tavily via env).</p>
            </div>
          ) : <p className="mt-3 text-xs italic text-muted-foreground">No external cost — pricing unavailable is not $0.</p>}
        </div>
      </div>

      {/* By usage type & cost type + drivers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="text-sm font-semibold">Cost by usage type</div>
          {breakdown ? (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between border-b border-border/30 py-1.5"><span className="text-muted-foreground">actual (provider-reported)</span><span className="font-mono">{fmtCost(breakdown.breakdown.byUsageType.actual.cost)} · {breakdown.breakdown.byUsageType.actual.count} records</span></div>
              <div className="flex justify-between border-b border-border/30 py-1.5"><span className="text-muted-foreground">estimated (heuristic)</span><span className="font-mono text-amber-400">{fmtCost(breakdown.breakdown.byUsageType.estimated.cost)} · {breakdown.breakdown.byUsageType.estimated.count} records</span></div>
              <div className="flex justify-between border-b border-border/30 py-1.5"><span className="text-muted-foreground">LLM vs external</span><span className="font-mono">LLM ${breakdown.breakdown.byCostType.llm.cost.toFixed(6)} ({breakdown.breakdown.byCostType.llm.percentage}%) · Ext ${breakdown.breakdown.byCostType.external.cost.toFixed(6)} ({breakdown.breakdown.byCostType.external.percentage}%)</span></div>
            </div>
          ) : null}
          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-1">
            <div className="text-xs font-semibold">Cost drivers — where is the money going?</div>
            {breakdown?.drivers.topModel && <div className="text-xs text-muted-foreground">Top model: <span className="font-mono text-foreground">{breakdown.drivers.topModel.model}</span> ({breakdown.drivers.topModel.percentage}% of LLM cost)</div>}
            {breakdown?.drivers.topAgent && <div className="text-xs text-muted-foreground">Top agent: <span className="font-mono text-foreground">{breakdown.drivers.topAgent.agent}</span> ({breakdown.drivers.topAgent.percentage}% of LLM cost)</div>}
            {breakdown?.drivers.topProvider && <div className="text-xs text-muted-foreground">Top provider: <span className="font-mono text-foreground">{breakdown.drivers.topProvider.provider}</span> ({breakdown.drivers.topProvider.percentage}%)</div>}
            {!breakdown?.drivers.topModel && <div className="text-xs italic text-muted-foreground">No driver data yet.</div>}
            <p className="text-[10px] italic text-muted-foreground/60">Factual share only — not a recommendation to optimize.</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Efficiency insights</div>
          {breakdown ? (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Total calculable cost</span><span className="font-mono">{fmtUsd(breakdown.totals.totalCost)}</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Calculable LLM cost</span><span className="font-mono">{fmtUsd(breakdown.totals.llmCost)}</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">External cost</span><span className="font-mono">{fmtUsd(breakdown.totals.externalCost)}</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Estimated cost share</span><span className="font-mono">{breakdown.breakdown.byUsageType.estimated.cost > 0 && breakdown.totals.totalCost > 0 ? `${((breakdown.breakdown.byUsageType.estimated.cost / breakdown.totals.totalCost) * 100).toFixed(1)}%` : "0%"}</span></div>
              <div className="flex justify-between py-1"><span className="text-muted-foreground">Avg records/search</span><span className="font-mono">{breakdown.coverage.totalSearches > 0 ? (breakdown.meta.llmRecordCount / breakdown.coverage.totalSearches).toFixed(1) : "—"}</span></div>
            </div>
          ) : <p className="text-xs italic text-muted-foreground">No insights yet.</p>}
        </div>
      </div>

      {/* Scaling scenarios */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-4 w-4 text-cyan" /> Scaling scenarios</div>
        <p className="mt-1 text-[11px] italic text-muted-foreground/70">Projections are modeled, not measured: projectedDailyCost = searchesPerDay × assumedCostPerSearch where assumedCostPerSearch = historicalCalculableCost / historicalCalculableSearchCount. Distinguishes searches/day from users/day.</p>
        {scError ? (
          <div className="mt-3 text-xs text-rose-400">Failed to load scaling data.</div>
        ) : scLoading ? (
          <Skeleton className="mt-3 h-40 w-full rounded-xl" />
        ) : scaling ? (
          <div className="mt-3 space-y-3">
            {scaling.insufficient && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Insufficient data for reliable projections</div>
                <ul className="list-disc pl-5 text-xs text-amber-400/80">
                  {scaling.insufficientReasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <p className="text-[11px] text-muted-foreground/60">Collect more searches with calculable cost before relying on projections.</p>
              </div>
            )}
            {scaling.warnings.map((w) => (
              <div key={w} className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-400"><AlertTriangle className="inline h-3 w-3 mr-1" />{w}</div>
            ))}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/40 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Scenario</th><th className="px-3 py-2 text-right">Daily cost</th><th className="px-3 py-2 text-right">Monthly cost</th><th className="px-3 py-2 text-right">LLM/day</th><th className="px-3 py-2 text-right">External/day</th></tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {scaling.projections.length > 0 ? scaling.projections.map((p) => (
                    <tr key={p.searchesPerDay} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono">{p.searchesPerDay.toLocaleString()}/day</td>
                      <td className="px-3 py-2 text-right font-mono">${p.projectedDailyCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">${p.projectedMonthlyCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">${p.projectedLlmDailyCost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">${p.projectedExternalDailyCost.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-3 py-4 text-center italic text-muted-foreground">Projections unavailable — see insufficient data reasons above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Custom scenario */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
              <span className="text-xs text-muted-foreground">Custom searches/day:</span>
              <input value={customScn} onChange={(e) => setCustomScn(e.target.value)} placeholder="5000" className="w-28 rounded-lg border border-border/50 bg-background px-2 py-1 font-mono text-xs outline-none focus:border-cyan/50" />
              {customValid && assumed != null ? (
                <span className="text-xs font-mono">→ ${(customProjected ?? 0).toFixed(2)}/day · ${((customProjected ?? 0) * 30).toFixed(2)}/mo</span>
              ) : (
                <span className="text-xs italic text-muted-foreground/60">Enter 1–1,000,000</span>
              )}
              {!customValid && customScn && <span className="text-xs text-rose-400">Invalid</span>}
            </div>
            <div className="rounded-lg bg-secondary/20 p-3 space-y-1 text-[11px] text-muted-foreground/70">
              <div><span className="font-semibold text-foreground">Assumptions:</span> {scaling.assumptions.formula}</div>
              <div>Historical period: {scaling.assumptions.historicalPeriod.from ? new Date(scaling.assumptions.historicalPeriod.from).toLocaleDateString() : "—"} → {scaling.assumptions.historicalPeriod.to ? new Date(scaling.assumptions.historicalPeriod.to).toLocaleDateString() : "now"} · {scaling.assumptions.historicalCalculableSearches} calculable of {scaling.assumptions.historicalTotalSearches} total ({scaling.assumptions.historicalCoveragePercent}%) · avg {scaling.assumptions.avgCostPerSearch != null ? `$${scaling.assumptions.avgCostPerSearch.toFixed(6)}` : "—"}/search</div>
              <div>{scaling.assumptions.note}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------- Page ----------

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.admin.analytics(),
  });

  // Phase 8 — cost overview (separate query, not duplicating analytics endpoint)
  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ["admin-cost-summary"],
    queryFn: () => api.admin.cost.summary(),
  });

  const kpis = [
    { label: "Total users", value: data?.users ?? "—" },
    { label: "Saved datasets", value: data?.saved ?? "—" },
    { label: "Collections", value: data?.collections ?? "—" },
    {
      label: "Searches (30d)",
      value: data?.series.slice(-30).reduce((a, r) => a + r.count, 0) ?? "—",
    },
  ];

  const series = data?.series ?? [];
  const last30 = series.slice(-30);

  const repos = data?.repositories ?? [];
  const perfDaily = data?.searchPerformance?.daily ?? [];
  const outcomes = data?.searchOutcomes;

  const donutData = [
    { name: "With results", value: outcomes?.withResults ?? 0, fill: "var(--chart-4)" },
    { name: "No results", value: outcomes?.noResults ?? 0, fill: "var(--destructive)" },
  ].filter((d) => d.value > 0);

  const cards: AnalyticsCard[] = [
    // Widget 1 — unchanged (real daily search volume from QueryLog).
    {
      id: "searches-over-time",
      title: "Searches over time",
      description: "Daily search volume across the platform",
      content: isLoading ? (
        <div className="flex h-full w-full flex-col justify-between py-2">
          <div className="flex items-end justify-between gap-2 h-44">
            {[40, 65, 30, 80, 50, 75, 60, 90, 45, 70, 85, 95].map((h, i) => (
              <Skeleton key={i} className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
            <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--cyan)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ),
      details: (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <StatRow
            label="Searches (60 days)"
            value={series.reduce((a, r) => a + r.count, 0).toLocaleString()}
          />
          <StatRow
            label="Searches (30 days)"
            value={last30.reduce((a, r) => a + r.count, 0).toLocaleString()}
          />
          <StatRow label="Cache hit rate" value={formatPct(data?.cacheHitRate)} />
          <StatRow label="Live merged searches" value={(data?.mergedCount ?? 0).toLocaleString()} />
        </div>
      ),
    },
    // Widget 2 — real datasets indexed per repository + real repo filter usage.
    {
      id: "repository-usage",
      title: "Repository usage distribution",
      description: "Datasets indexed per repository contributing to searches",
      content: isLoading ? (
        <div className="flex h-full w-full flex-col justify-center gap-3 py-2">
          {[75, 90, 60, 45, 80].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-4 rounded" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : repos.length === 0 ? (
        <EmptyState label="No repository or dataset data has been recorded yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={repos.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 12 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              opacity={0.5}
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              width={96}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
            />
            <Bar
              dataKey="datasetsIndexed"
              name="Datasets indexed"
              fill="var(--electric)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ),
      details: data && <RepositoryUsageDetails data={data} />,
    },
    // Widget 3 — real per-day average search-operation durations (AgentLog).
    {
      id: "search-performance",
      title: "Search performance",
      description: "Average search duration per day from recorded backend timings",
      content: isLoading ? (
        <div className="flex h-full w-full flex-col justify-between py-2">
          <div className="flex items-end justify-between gap-2 h-44">
            {[50, 40, 70, 55, 65, 45, 80, 60, 75, 50, 60, 70].map((h, i) => (
              <Skeleton key={i} className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : perfDaily.length === 0 ? (
        <EmptyState label="No search operation timings have been recorded yet. Durations appear as searches run." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={perfDaily}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
            <XAxis
              dataKey="day"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value: number | string) => [
                `${Math.round(Number(value)).toLocaleString()} ms`,
                "Avg duration",
              ]}
            />
            <Line
              type="monotone"
              dataKey="avgMs"
              stroke="var(--cyan)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ),
      details: data && <SearchPerformanceDetails data={data} />,
    },
    // Widget 4 — real search outcomes (QueryLog result counts) as a donut.
    {
      id: "search-outcomes",
      title: "Search outcome distribution",
      description: "Overall search quality — results vs. no results",
      content: isLoading ? (
        <div className="flex h-full w-full items-center justify-center gap-6">
          <Skeleton className="h-36 w-36 rounded-full" />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
      ) : donutData.length === 0 ? (
        <EmptyState label="No search outcomes have been recorded yet." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              stroke="none"
            >
              {donutData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      ),
      details: data && <SearchOutcomeDetails data={data} />,
    },
  ];

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const activeCard = cards.find((card) => card.id === activeCardId) ?? null;

  return (
    <>
      <AdminPageHeader title="Analytics & reports" description="Platform-wide engagement metrics" />
      <div className="space-y-6 px-6 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {k.label}
              </div>
              <div className="mt-2 font-display text-3xl font-semibold">
                {isLoading ? <Skeleton className="h-9 w-24 rounded-lg" /> : k.value}
              </div>
            </div>
          ))}
        </div>

        {/* 2×2 analytics dashboard — every value below comes from backend data */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <AnalyticsChartCard
              key={card.id}
              title={card.title}
              description={card.description}
              onExpand={() => setActiveCardId(card.id)}
            >
              {card.content}
            </AnalyticsChartCard>
          ))}
        </div>

        {/* Phase 8 — Provenance distribution */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Retrieval provenance</h2>
          <div className="glass rounded-2xl p-5">
            <p className="mb-3 text-xs text-muted-foreground/70 italic">
              Four-way retrieval provenance (Phase 2). Distinct from resultSource — each category is kept separate.
            </p>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "mongodb_dataset", color: "from-emerald-400/30 to-emerald-400/10", dot: "bg-emerald-400", desc: "MongoDB datasets collection" },
                  { label: "mongodb_catalog", color: "from-cyan/30 to-cyan/10", dot: "bg-cyan", desc: "MongoDB catalog collection" },
                  { label: "repository", color: "from-violet-400/30 to-violet-400/10", dot: "bg-violet-400", desc: "Live repository API calls" },
                  { label: "discovery", color: "from-amber-400/30 to-amber-400/10", dot: "bg-amber-400", desc: "Web discovery / fallback agent" },
                ].map(({ label, color, dot, desc }) => (
                  <div key={label} className={`rounded-xl border border-border/50 bg-gradient-to-b ${color} p-3 space-y-1.5`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                      <code className="text-[11px] font-mono text-foreground truncate">{label}</code>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                    <p className="text-[10px] text-muted-foreground/60">See Search logs for per-request detail</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Phase 8 — Cost overview (30d summary) */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cost overview (30 days)</h2>
          <div className="glass rounded-2xl p-5">
            {costLoading ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/40 py-2.5">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            ) : costData ? (
              <div className="space-y-3">
                {!costData.pricingAvailable && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2.5 text-xs text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Pricing configuration unavailable — cost cannot be calculated. This is not the same as zero cost.
                  </div>
                )}
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  {[
                    { label: "Total cost (30d)", value: costData.costAvailable && costData.totalCost != null ? `$${costData.totalCost.toFixed(4)}` : null },
                    { label: "LLM cost (30d)", value: costData.costAvailable && costData.llmCost != null ? `$${costData.llmCost.toFixed(4)}` : null },
                    { label: "External API cost (30d)", value: costData.costAvailable && costData.externalCost != null ? `$${costData.externalCost.toFixed(4)}` : null },
                    { label: "Searches counted", value: (costData.searchCount ?? 0).toLocaleString() },
                    { label: "Actual (provider-reported)", value: (costData.actualSearches ?? 0).toLocaleString() },
                    { label: "Estimated (heuristic)", value: (costData.estimatedSearches ?? 0).toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0 text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-mono tabular-nums ${value == null ? "italic text-muted-foreground/60" : ""}`}>
                        {value ?? "Pricing unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-rose-400" /> Failed to load cost data.
              </div>
            )}
          </div>
        </section>

        {/* Phase 11 — Cost Intelligence & Scaling */}
        <CostIntelligenceSection />
      </div>

      <AnalyticsChartModal
        open={activeCard !== null}
        onOpenChange={(open) => {
          if (!open) setActiveCardId(null);
        }}
        title={activeCard?.title ?? ""}
        description={activeCard?.description}
        details={activeCard?.details}
      >
        {activeCard?.content ?? null}
      </AnalyticsChartModal>
    </>
  );
}
