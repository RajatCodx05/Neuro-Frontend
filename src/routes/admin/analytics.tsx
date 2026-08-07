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
import { Inbox } from "lucide-react";
import { AnalyticsChartCard, AnalyticsChartModal } from "@/components/app/analytics-chart-card";

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

// ---------- Page ----------

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.admin.analytics(),
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
      content: (
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
      content:
        repos.length === 0 ? (
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
      content:
        perfDaily.length === 0 ? (
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
      content:
        donutData.length === 0 ? (
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
              <div className="mt-2 font-display text-3xl font-semibold">{k.value}</div>
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
