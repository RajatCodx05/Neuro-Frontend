import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Search, X, Inbox, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type AdminTokenItem } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/tokens")({
  head: () => ({ meta: [{ title: "Admin · Token usage — NeuroSearch AI" }] }),
  component: TokensPage,
});

const PAGE_SIZE = 20;
type Dim = "user" | "day" | "month" | "agent";

// ponytail: actual = provider-reported; estimated = heuristic — never show same badge
function UsageTypeBadge({ type }: { type: "actual" | "estimated" | null | undefined }) {
  if (type === "actual") return (
    <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
      actual
    </span>
  );
  if (type === "estimated") return (
    <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
      estimated
    </span>
  );
  return <span className="text-muted-foreground/50 text-xs italic">—</span>;
}

function CostCell({ cost }: { cost: AdminTokenItem["cost"] | undefined }) {
  if (!cost) return <span className="text-muted-foreground/50 text-xs italic">—</span>;
  if (!cost.costAvailable || cost.totalCost == null) {
    return <span className="text-[10px] italic text-muted-foreground/60">Pricing unavailable</span>;
  }
  return (
    <span className="font-mono tabular-nums text-xs">
      ${cost.totalCost.toFixed(6)}
    </span>
  );
}

function getInitialRequestId(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("requestId");
  if (fromUrl) return fromUrl;
  try {
    const ss = sessionStorage.getItem("admin_requestId_filter");
    if (ss) { sessionStorage.removeItem("admin_requestId_filter"); return ss; }
  } catch {}
  return "";
}

function TokensPage() {
  const [dim, setDim] = useState<Dim>("day");
  const [agentFilter, setAgentFilter] = useState("");
  const [usageTypeFilter, setUsageTypeFilter] = useState("");
  const initialRid = getInitialRequestId();
  const [requestIdInput, setRequestIdInput] = useState(initialRid);
  const [requestIdFilter, setRequestIdFilter] = useState(initialRid);
  const [page, setPage] = useState(1);

  const hasFilters = !!(agentFilter || usageTypeFilter || requestIdFilter);

  // ponytail: no filters → original flat array behavior; with filters → paginated
  const { data: rawData, isLoading } = useQuery<AdminTokenItem[] | { items: AdminTokenItem[]; total: number; limit: number; offset: number }>({
    queryKey: ["admin-tokens-v2", agentFilter, usageTypeFilter, requestIdFilter, page],
    queryFn: () => {
      if (!hasFilters) return api.admin.infra.tokens() as unknown as Promise<AdminTokenItem[]>;
      return api.admin.infra.tokens({
        agent: agentFilter || undefined,
        usageType: usageTypeFilter || undefined,
        requestId: requestIdFilter || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }) as Promise<{ items: AdminTokenItem[]; total: number; limit: number; offset: number }>;
    },
    staleTime: 15_000,
  });

  // Normalize to flat array / paginated depending on response shape
  const isPaginated = rawData && !Array.isArray(rawData) && "items" in rawData;
  const flatItems: AdminTokenItem[] = isPaginated
    ? (rawData as { items: AdminTokenItem[] }).items
    : ((rawData as AdminTokenItem[]) ?? []);
  const total = isPaginated ? (rawData as { total: number }).total : flatItems.length;

  // Client-side pagination only when no server-side filters (flat array path)
  const clientPageItems = useMemo(() => {
    if (hasFilters) return flatItems; // server already paginated
    const offset = (page - 1) * PAGE_SIZE;
    return flatItems.slice(offset, offset + PAGE_SIZE);
  }, [flatItems, page, hasFilters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Chart bucketing (over entire non-paginated flatItems for chart)
  const chartSource = (!hasFilters ? flatItems : []) as AdminTokenItem[];
  const bucketed = useMemo(() => {
    const map = new Map<string, number>();
    chartSource.forEach((e) => {
      let k = "";
      const tokens = e.totalTokens ?? e.tokens;
      if (dim === "user") k = e.userEmail;
      else if (dim === "agent") k = e.agent;
      else if (dim === "day") k = new Date(e.createdAt).toISOString().slice(0, 10);
      else k = new Date(e.createdAt).toISOString().slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + tokens);
    });
    return Array.from(map.entries()).sort().map(([label, tokens]) => ({ label, tokens }));
  }, [chartSource, dim]);

  const applyRequestId = useCallback(() => {
    setRequestIdFilter(requestIdInput.trim());
    setPage(1);
  }, [requestIdInput]);

  const clearAll = useCallback(() => {
    setAgentFilter(""); setUsageTypeFilter("");
    setRequestIdInput(""); setRequestIdFilter(""); setPage(1);
  }, []);

  const totalTokens = flatItems.reduce((a, e) => a + (e.totalTokens ?? e.tokens), 0);

  return (
    <>
      <AdminPageHeader
        title="Token usage"
        description={isLoading ? "Loading token usage…" : `${totalTokens.toLocaleString()} tokens · ${total.toLocaleString()} events`}
      />
      <div className="space-y-6 px-6 py-6 md:px-8">

        {/* Filters */}
        <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
          {/* Grouping dim (only makes sense for chart, shown when no server filter) */}
          {!hasFilters && (
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
              {(["day", "month", "user", "agent"] as const).map((d) => (
                <button key={d} onClick={() => setDim(d)}
                  className={`rounded-full px-3 py-1 capitalize ${dim === d ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* RequestId */}
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 min-w-44">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={requestIdInput}
              onChange={(e) => setRequestIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyRequestId()}
              placeholder="Filter by request ID…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 font-mono"
            />
            {requestIdInput && (
              <button onClick={() => { setRequestIdInput(""); setRequestIdFilter(""); setPage(1); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Agent filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Agent:</span>
            <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer">
              <option value="" className="bg-[oklch(0.18_0.02_258)]">All agents</option>
              <option value="fallback" className="bg-[oklch(0.18_0.02_258)]">fallback</option>
              <option value="parse_query" className="bg-[oklch(0.18_0.02_258)]">parse_query</option>
              <option value="repository_search" className="bg-[oklch(0.18_0.02_258)]">repository_search</option>
            </select>
          </div>

          {/* Usage type filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Type:</span>
            <select value={usageTypeFilter} onChange={(e) => { setUsageTypeFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer">
              <option value="" className="bg-[oklch(0.18_0.02_258)]">All</option>
              <option value="actual" className="bg-[oklch(0.18_0.02_258)]">actual (provider-reported)</option>
              <option value="estimated" className="bg-[oklch(0.18_0.02_258)]">estimated (heuristic)</option>
            </select>
          </div>

          <button onClick={applyRequestId} className="rounded-xl bg-cyan/10 px-3 py-1.5 text-sm font-medium text-cyan hover:bg-cyan/20 transition">
            Apply
          </button>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition">Clear</button>
          )}
        </div>

        {/* Chart (only when no server-side filters, chart over full flat array) */}
        {!hasFilters && (
          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-semibold">Tokens by {dim}</div>
            {isLoading ? (
              <div className="mt-4 h-64 flex flex-col justify-between py-2">
                <div className="flex items-end justify-between gap-2 h-44">
                  {[30, 50, 40, 70, 60, 85, 45, 90, 65, 80, 55, 75].map((h, i) => (
                    <Skeleton key={i} className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ) : bucketed.length === 0 ? (
              <div className="mt-4 flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">No token data recorded yet.</p>
              </div>
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bucketed}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)", borderRadius: 12, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                    />
                    <Line type="monotone" dataKey="tokens" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 3, fill: "var(--cyan)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="glass overflow-hidden rounded-2xl">
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-b border-white/5 [.light_&]:border-black/5 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs text-muted-foreground">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Provider / Model</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">In</th>
                <th className="px-4 py-3 text-right">Out</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded font-mono" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-10 rounded" /></div></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-10 rounded" /></div></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-12 rounded" /></div></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-16 rounded" /></div></td>
                  </tr>
                ))
              ) : clientPageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No token usage recorded yet.</p>
                  </td>
                </tr>
              ) : (
                clientPageItems.map((e) => (
                  <tr key={e._id ?? (e as any).id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-cyan">{e.agent}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {e.provider ?? "—"}{e.model && e.model !== "unknown" ? ` / ${e.model}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <UsageTypeBadge type={e.usageType} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {e.inputTokens ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {e.outputTokens ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {(e.totalTokens ?? e.tokens).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CostCell cost={e.cost} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Usage type legend */}
        <div className="glass rounded-2xl px-5 py-4 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground mb-2">Token usage type legend</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">actual</span>
            Provider-reported token counts from the LLM API response. These are authoritative.
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">estimated</span>
            Heuristic/fallback estimate — not provider-reported. Cost calculations may be inaccurate.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/50 italic">—</span>
            Usage type not recorded for this entry.
          </div>
        </div>
      </div>
    </>
  );
}
